/**
 * test_phase08_optimizer.js
 *
 * Automated verification test suite for Phase 08 — Smart Priority + Route Optimizer
 */

require('dotenv').config();
const http = require('http');
const { optimizeCrewRoute } = require('./services/routeOptimizer');
const { calculateHaversineDistance } = require('./utils/haversine');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(b) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: b });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + (parsed.search || ''),
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token },
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(b) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: b });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function patch(url, data, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Authorization: 'Bearer ' + token,
        },
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(b) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: b });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function runPhase08Tests() {
  console.log('🚀 Running Phase 08 Smart Priority + Route Optimizer Verification...\n');

  // 1. Direct Optimizer Heuristic Tests (Edge cases A-I)
  console.log('--- PART 1: HEURISTIC ALGORITHM UNIT TESTS ---');

  const testCrew = {
    _id: 'crew-001',
    name: 'Test Crew',
    currentLocation: { latitude: 19.1136, longitude: 72.8697 }, // Andheri
  };

  // Test H: Empty Route
  console.log('1. Testing empty requests array (0 stops)...');
  const emptyRes = await optimizeCrewRoute(testCrew, []);
  console.log(`   ✓ Total stops: ${emptyRes.totalStops}, Distance: ${emptyRes.totalDistanceKm}km`);
  if (emptyRes.totalStops !== 0 || emptyRes.totalDistanceKm !== 0) {
    throw new Error('Empty route test failed');
  }

  // Test G: Single stop
  console.log('2. Testing single request...');
  const singleStop = {
    _id: 'req-single',
    status: 'ASSIGNED',
    priorityScore: 70,
    priorityLevel: 'HIGH',
    location: { latitude: 19.12, longitude: 72.85 },
    createdAt: new Date(),
  };
  const singleRes = await optimizeCrewRoute(testCrew, [singleStop]);
  console.log(`   ✓ Total stops: ${singleRes.totalStops}, Sequence 1 is: ${singleRes.orderedStops[0].requestId}`);
  if (singleRes.totalStops !== 1) throw new Error('Single stop test failed');

  // Test I: Invalid coordinates handling
  console.log('3. Testing invalid/missing coordinates exclusion...');
  const invalidReq = {
    _id: 'req-invalid',
    status: 'ASSIGNED',
    priorityScore: 90,
    priorityLevel: 'CRITICAL',
    location: { latitude: null, longitude: null },
    createdAt: new Date(),
  };
  const invalidRes = await optimizeCrewRoute(testCrew, [singleStop, invalidReq]);
  console.log(`   ✓ Valid stops mapped: ${invalidRes.totalStops}, Unmapped count: ${invalidRes.unmappedRequestsCount}`);
  if (invalidRes.totalStops !== 1 || invalidRes.unmappedRequestsCount !== 1) {
    throw new Error('Invalid coordinate handling test failed');
  }

  // Test D: Critical Priority Protection
  console.log('4. Testing Critical Priority Protection rule...');
  const nearbyLow = {
    _id: 'req-low-near',
    status: 'ASSIGNED',
    priorityScore: 30,
    priorityLevel: 'LOW',
    location: { latitude: 19.114, longitude: 72.870 }, // 100m away
    createdAt: new Date(),
  };
  const farCritical = {
    _id: 'req-crit-far',
    status: 'ASSIGNED',
    priorityScore: 95,
    priorityLevel: 'CRITICAL',
    location: { latitude: 19.0544, longitude: 72.8405 }, // 7km away in Bandra
    createdAt: new Date(),
  };
  const critRes = await optimizeCrewRoute(testCrew, [nearbyLow, farCritical]);
  console.log(`   ✓ Stop #1 chosen: ${critRes.orderedStops[0].requestId} (${critRes.orderedStops[0].priorityLevel})`);
  console.log(`   ✓ Stop #2 chosen: ${critRes.orderedStops[1].requestId} (${critRes.orderedStops[1].priorityLevel})`);
  if (critRes.orderedStops[0].requestId !== 'req-crit-far') {
    throw new Error('Critical priority protection failed: far critical was not prioritized before near low');
  }

  // Test In-Progress Lock
  console.log('5. Testing In-Progress Active Collection Lock...');
  const activeInProg = {
    _id: 'req-in-prog',
    status: 'IN_PROGRESS',
    priorityScore: 40,
    priorityLevel: 'MEDIUM',
    location: { latitude: 19.15, longitude: 72.86 },
    createdAt: new Date(),
  };
  const inProgRes = await optimizeCrewRoute(testCrew, [farCritical, activeInProg]);
  console.log(`   ✓ Stop #1 (in-progress lock): ${inProgRes.orderedStops[0].requestId} (${inProgRes.orderedStops[0].status})`);
  if (inProgRes.orderedStops[0].requestId !== 'req-in-prog') {
    throw new Error('In-progress active pickup must always remain Stop #1');
  }

  // 2. Integration Tests via HTTP API
  console.log('\n--- PART 2: HTTP API & RBAC INTEGRATION TESTS ---');

  // Authenticate Admin, Resident, and Crew
  const adminLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'admin@ecoroute.demo',
    password: 'admin123',
  });
  const adminToken = adminLogin.data.data.token;

  const crewLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'crew@ecoroute.demo',
    password: 'crew123',
  });
  const crewToken = crewLogin.data.data.token;

  const resLogin = await post('http://localhost:5000/api/auth/login', {
    email: 'rahul@ecoroute.demo',
    password: 'resident123',
  });
  const resToken = resLogin.data.data.token;

  // RBAC checks
  console.log('6. Checking RBAC security on route endpoints...');
  const resCrewAccess = await get('http://localhost:5000/api/routes/my-route', resToken);
  if (resCrewAccess.status === 403) {
    console.log('   ✓ Security PASS: Resident cannot access /api/routes/my-route (403 Forbidden)');
  } else {
    throw new Error(`Expected 403 for resident, got ${resCrewAccess.status}`);
  }

  // Crew route inspection
  console.log('7. Testing Crew accessing GET /api/routes/my-route...');
  const crewRouteRes = await get('http://localhost:5000/api/routes/my-route', crewToken);
  if (crewRouteRes.status === 200 && crewRouteRes.data.success) {
    const d = crewRouteRes.data.data;
    console.log(`   ✓ Crew Smart Route loaded successfully!`);
    console.log(`   ✓ Routing Mode: ${d.routingMode}`);
    console.log(`   ✓ Total Stops: ${d.totalStops}`);
    console.log(`   ✓ Road Distance: ${d.totalDistanceKm} km`);
    console.log(`   ✓ Estimated Travel Duration: ${d.estimatedDurationMinutes} min`);
    console.log(`   ✓ Approx. Distance Saved: ${d.distanceSavedKm} km (${d.distanceSavedPercent}%)`);
    console.log(`   ✓ Polyline coordinates: ${d.polyline.length} points`);
  } else {
    throw new Error('Failed to load crew smart route: ' + JSON.stringify(crewRouteRes));
  }

  // Admin route inspection for specific crew
  console.log('8. Testing Admin accessing GET /api/routes/crew/:crewId...');
  const crewsList = await get('http://localhost:5000/api/crews', adminToken);
  const targetCrew = crewsList.data.data[0];
  const adminCrewRoute = await get(`http://localhost:5000/api/routes/crew/${targetCrew._id}`, adminToken);
  if (adminCrewRoute.status === 200 && adminCrewRoute.data.success) {
    console.log(`   ✓ Admin inspected smart route for ${targetCrew.name}: ${adminCrewRoute.data.data.totalStops} stops`);
  } else {
    throw new Error('Admin route inspection failed');
  }

  // 3. Complete Collection Progression & Route Recalculation Flow (Section 26 & 46)
  console.log('\n--- PART 3: COLLECTION PROGRESSION & ROUTE RECALCULATION FLOW ---');

  const initialRoute = crewRouteRes.data.data;
  if (initialRoute.orderedStops.length > 0) {
    const firstStop = initialRoute.orderedStops[0];
    console.log(`9. Advancing collection on Stop #1 (${firstStop.displayId})...`);

    // If assigned, start collection
    if (firstStop.status === 'ASSIGNED') {
      const startRes = await patch(
        `http://localhost:5000/api/requests/${firstStop.requestId}/status`,
        { status: 'IN_PROGRESS' },
        crewToken
      );
      console.log(`   ✓ Marked Stop #1 as IN_PROGRESS (status ${startRes.status})`);
    }

    // Now complete the stop
    console.log(`10. Completing collection for Stop #1 (${firstStop.displayId})...`);
    const compRes = await patch(
      `http://localhost:5000/api/requests/${firstStop.requestId}/status`,
      { status: 'COMPLETED' },
      crewToken
    );
    console.log(`   ✓ Marked Stop #1 as COMPLETED (status ${compRes.status})`);

    // Invalidate cache or fetch updated route
    console.log('11. Fetching updated smart route after completion...');
    const updatedRouteRes = await get('http://localhost:5000/api/routes/my-route', crewToken);
    const updatedRoute = updatedRouteRes.data.data;
    console.log(`   ✓ Previous stops count: ${initialRoute.totalStops}`);
    console.log(`   ✓ New stops count: ${updatedRoute.totalStops}`);
    const completedStopStillThere = updatedRoute.orderedStops.some(
      (s) => s.requestId === firstStop.requestId
    );
    console.log(`   ✓ Completed stop removed from remaining route? ${!completedStopStillThere}`);
    if (completedStopStillThere) {
      throw new Error('Completed stop should have been removed from the remaining route');
    }
  }

  console.log('\n==================================================');
  console.log('✅ ALL PHASE 08 OPTIMIZER TESTS COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
}

runPhase08Tests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
