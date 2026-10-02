/**
 * routeOptimizer.js — Smart Priority + Route Optimizer for EcoSaathi
 *
 * Implements a deterministic, explainable greedy heuristic balancing:
 * 1. Normalized Priority Score (60%)
 * 2. Normalized Waiting Time (20%)
 * 3. Proximity / Geographic Efficiency (20%)
 *
 * Protects critical requests and preserves in-progress collection state.
 * Interacts with geoapifyService for actual road routing with resilient fallback.
 */

const {
  calculateHaversineDistance,
  calculateTotalPathDistance,
} = require('../utils/haversine');
const { getRoadRoute } = require('./geoapifyService');
const { calculatePriorityScore } = require('../utils/priorityCalculator');

// ── HEURISTIC WEIGHTS (Centralized Configuration) ───────────────────────────
// These weights dictate candidate stop selection order:
// - 60% Priority Score (strongly favors urgent/critical waste)
// - 20% Waiting Time (prevents starvation of older, aging requests)
// - 20% Proximity (favors geographically closer stops to reduce travel time)
const WEIGHT_PRIORITY = 0.60;
const WEIGHT_WAITING = 0.20;
const WEIGHT_PROXIMITY = 0.20;

// Maximum SLA waiting time reference in hours for normalization (e.g. 48 hours)
const MAX_SLA_HOURS = 48;

// Fallback municipal depot coordinate in Mumbai if crew current location is unavailable
const DEFAULT_DEPOT = {
  latitude: parseFloat(process.env.DEPOT_LAT) || 19.0760,
  longitude: parseFloat(process.env.DEPOT_LNG) || 72.8777,
  label: 'EcoSaathi Municipal Depot (Central Mumbai)',
};

// ── Simple In-Memory Route Cache (60 seconds TTL) ───────────────────────────
const routeCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

/**
 * Determine a clean, human-readable reason explaining why a stop was selected.
 */
function deriveSelectionReason(candidate, distanceKm, isImmediate) {
  if (isImmediate || candidate.status === 'IN_PROGRESS') {
    return 'Currently in progress';
  }
  if (candidate.priorityLevel === 'CRITICAL') {
    return distanceKm < 3.0 ? 'Critical priority + nearby stop' : 'Critical priority pickup';
  }
  if (candidate.priorityLevel === 'HIGH') {
    return distanceKm < 2.5 ? 'High priority + nearby stop' : 'High priority pickup';
  }
  const hoursWaiting = (Date.now() - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursWaiting >= 12) {
    return 'Extended waiting time';
  }
  if (distanceKm < 2.0) {
    return 'Proximity-efficient pickup';
  }
  return 'Standard scheduled collection';
}

/**
 * Main Route Optimization function for a collection crew.
 *
 * @param {object} crew The CollectionCrew document
 * @param {Array<object>} rawRequests Assigned requests for this crew
 * @returns {Promise<object>} Standardized EcoSaathi Smart Route Payload
 */
async function optimizeCrewRoute(crew, rawRequests = []) {
  if (!crew) {
    throw new Error('Crew context is required to optimize a collection route.');
  }

  // 1. Separate valid requests from unmapped requests (missing coordinates)
  const eligibleRequests = [];
  const unmappedRequests = [];

  rawRequests.forEach((req) => {
    // Only consider active statuses
    if (!['ASSIGNED', 'IN_PROGRESS'].includes(req.status)) return;

    const lat = req.location?.latitude;
    const lng = req.location?.longitude;

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      eligibleRequests.push(req);
    } else {
      unmappedRequests.push({
        _id: req._id,
        requestId: req.requestId || req._id,
        wasteType: req.wasteType,
        status: req.status,
        reason: 'Missing geographic coordinates',
      });
    }
  });

  // 2. Identify Starting Location
  const hasCrewLoc =
    crew.currentLocation?.latitude &&
    crew.currentLocation?.longitude &&
    !isNaN(crew.currentLocation.latitude) &&
    !isNaN(crew.currentLocation.longitude);

  const startLocation = hasCrewLoc
    ? {
        latitude: crew.currentLocation.latitude,
        longitude: crew.currentLocation.longitude,
        label: `${crew.name} Current Stored Location`,
      }
    : DEFAULT_DEPOT;

  // 3. Handle Empty Route (All pickups completed or none assigned)
  if (eligibleRequests.length === 0) {
    return {
      crew: {
        id: crew._id,
        name: crew.name,
        vehicleNumber: crew.vehicleNumber || 'Standard Van',
      },
      startLocation,
      routingMode: 'road',
      totalStops: 0,
      totalDistanceKm: 0,
      estimatedDurationMinutes: 0,
      priorityPickupsCount: 0,
      baselineDistanceKm: 0,
      optimizedApproxDistanceKm: 0,
      distanceSavedKm: 0,
      distanceSavedPercent: 0,
      orderedStops: [],
      unmappedRequestsCount: unmappedRequests.length,
      unmappedRequests,
      polyline: [],
      routeGeometry: null,
      message: 'All pickups completed! No active collection stops are currently assigned to your crew.',
    };
  }

  // 4. Generate Cache Key to conserve Geoapify quota
  const cacheKey = `${crew._id}_${rawRequests
    .map((r) => `${r._id}:${r.status}:${r.updatedAt || r.createdAt}`)
    .sort()
    .join('|')}_${startLocation.latitude},${startLocation.longitude}`;

  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 5. Ensure fresh priority scoring based on dynamic waiting time
  const enrichedRequests = eligibleRequests.map((req) => {
    // If priority wasn't calculated yet, calculate now
    if (!req.priorityScore || !req.priorityLevel) {
      const scored = calculatePriorityScore(req);
      return {
        ...req.toObject ? req.toObject() : req,
        priorityScore: scored.priorityScore,
        priorityLevel: scored.priorityLevel,
      };
    }
    return req.toObject ? req.toObject() : req;
  });

  // 6. Compute Baseline Route Distance (Original Assignment / Created Order)
  const baselineWaypoints = [
    startLocation,
    ...enrichedRequests.map((r) => ({
      latitude: r.location.latitude,
      longitude: r.location.longitude,
    })),
  ];
  const baselineDistanceKm = calculateTotalPathDistance(baselineWaypoints);

  // 7. HEURISTIC GREEDY OPTIMIZATION
  let currentPosition = {
    latitude: startLocation.latitude,
    longitude: startLocation.longitude,
  };

  const remaining = [...enrichedRequests];
  const orderedStops = [];

  // RULE A: Check if any request is already IN_PROGRESS -> must be Stop #1
  const inProgressIndex = remaining.findIndex((r) => r.status === 'IN_PROGRESS');
  if (inProgressIndex !== -1) {
    const inProgStop = remaining.splice(inProgressIndex, 1)[0];
    const dist = calculateHaversineDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      inProgStop.location.latitude,
      inProgStop.location.longitude
    );

    orderedStops.push({
      sequence: 1,
      requestId: inProgStop._id,
      displayId: inProgStop.requestId || inProgStop._id,
      wasteType: inProgStop.wasteType,
      quantity: inProgStop.quantity,
      urgency: inProgStop.urgency,
      priorityLevel: inProgStop.priorityLevel,
      priorityScore: inProgStop.priorityScore,
      status: inProgStop.status,
      location: inProgStop.location,
      approxDistanceToStopKm: dist,
      selectionReason: deriveSelectionReason(inProgStop, dist, true),
    });

    currentPosition = {
      latitude: inProgStop.location.latitude,
      longitude: inProgStop.location.longitude,
    };
  }

  // RULE B: Sequentially choose the best next stop from remaining candidates
  const now = Date.now();

  while (remaining.length > 0) {
    // Check if CRITICAL requests exist among remaining
    const criticalCandidates = remaining.filter((r) => r.priorityLevel === 'CRITICAL');
    const candidatePool = criticalCandidates.length > 0 ? criticalCandidates : remaining;

    let bestScore = -Infinity;
    let bestIndexInPool = 0;
    let bestDistance = 0;

    for (let i = 0; i < candidatePool.length; i++) {
      const candidate = candidatePool[i];

      // Normalized Priority: 0.0 to 1.0
      const normPriority = Math.min(Math.max((candidate.priorityScore || 50) / 100, 0), 1);

      // Normalized Elapsed Waiting Time: 0.0 to 1.0
      const hoursWaiting = Math.max(0, (now - new Date(candidate.createdAt).getTime()) / (1000 * 60 * 60));
      const normWaiting = Math.min(hoursWaiting / MAX_SLA_HOURS, 1);

      // Distance from current position in km
      const distanceKm = calculateHaversineDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        candidate.location.latitude,
        candidate.location.longitude
      );

      // Proximity Score: 1 / (1 + distanceKm) -> higher for closer stops
      const proximityScore = 1 / (1 + distanceKm);

      // Heuristic Selection Score formula
      const score =
        WEIGHT_PRIORITY * normPriority +
        WEIGHT_WAITING * normWaiting +
        WEIGHT_PROXIMITY * proximityScore;

      if (score > bestScore) {
        bestScore = score;
        bestIndexInPool = i;
        bestDistance = distanceKm;
      }
    }

    // Pick best candidate and remove from remaining list
    const chosenCandidate = candidatePool[bestIndexInPool];
    const actualIndexInRemaining = remaining.indexOf(chosenCandidate);
    remaining.splice(actualIndexInRemaining, 1);

    orderedStops.push({
      sequence: orderedStops.length + 1,
      requestId: chosenCandidate._id,
      displayId: chosenCandidate.requestId || chosenCandidate._id,
      wasteType: chosenCandidate.wasteType,
      quantity: chosenCandidate.quantity,
      urgency: chosenCandidate.urgency,
      priorityLevel: chosenCandidate.priorityLevel,
      priorityScore: chosenCandidate.priorityScore,
      status: chosenCandidate.status,
      location: chosenCandidate.location,
      approxDistanceToStopKm: bestDistance,
      selectionReason: deriveSelectionReason(chosenCandidate, bestDistance, false),
    });

    // Advance route pointer to chosen stop
    currentPosition = {
      latitude: chosenCandidate.location.latitude,
      longitude: chosenCandidate.location.longitude,
    };
  }

  // 8. Calculate Optimized Approx Distance via Haversine
  const optimizedWaypoints = [
    startLocation,
    ...orderedStops.map((s) => ({
      latitude: s.location.latitude,
      longitude: s.location.longitude,
    })),
  ];
  const optimizedApproxDistanceKm = calculateTotalPathDistance(optimizedWaypoints);

  // Calculate Distance and Efficiency Comparisons
  const distanceSavedKm = +(baselineDistanceKm - optimizedApproxDistanceKm).toFixed(1);
  const distanceSavedPercent =
    baselineDistanceKm > 0
      ? Math.round(((baselineDistanceKm - optimizedApproxDistanceKm) / baselineDistanceKm) * 100)
      : 0;

  const priorityPickupsCount = orderedStops.filter((s) =>
    ['CRITICAL', 'HIGH'].includes(s.priorityLevel?.toUpperCase())
  ).length;

  // 9. Call Geoapify Routing API for real road navigation
  const roadResult = await getRoadRoute(optimizedWaypoints);

  let routingMode = 'fallback';
  let totalDistanceKm = optimizedApproxDistanceKm;
  let estimatedDurationMinutes = Math.max(
    5,
    Math.round((optimizedApproxDistanceKm / 25) * 60) + orderedStops.length * 8
  );
  let routeGeometry = null;
  let polyline = optimizedWaypoints.map((p) => [p.latitude, p.longitude]);

  if (roadResult.success && roadResult.polyline?.length > 0) {
    routingMode = 'road';
    totalDistanceKm = roadResult.distanceKm;
    estimatedDurationMinutes = roadResult.durationMinutes;
    routeGeometry = roadResult.routeGeometry;
    polyline = roadResult.polyline;
  } else {
    console.info(
      `[RouteOptimizer] Operating in fallback mode for Crew ${crew.name}. (${roadResult.error || 'No road route'})`
    );
  }

  const responsePayload = {
    crew: {
      id: crew._id,
      name: crew.name,
      vehicleNumber: crew.vehicleNumber || 'Standard Van',
    },
    startLocation,
    routingMode, // 'road' | 'fallback'
    totalStops: orderedStops.length,
    totalDistanceKm,
    estimatedDurationMinutes,
    priorityPickupsCount,
    baselineDistanceKm,
    optimizedApproxDistanceKm,
    distanceSavedKm,
    distanceSavedPercent,
    orderedStops,
    unmappedRequestsCount: unmappedRequests.length,
    unmappedRequests,
    polyline,
    routeGeometry,
  };

  // Cache response for 60 seconds
  routeCache.set(cacheKey, {
    timestamp: Date.now(),
    data: responsePayload,
  });

  return responsePayload;
}

module.exports = {
  optimizeCrewRoute,
  WEIGHT_PRIORITY,
  WEIGHT_WAITING,
  WEIGHT_PROXIMITY,
};
