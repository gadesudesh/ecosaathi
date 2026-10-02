/**
 * routeController.js — Controller handling Smart Collection Route requests
 *
 * GET /api/routes/my-route       — Crew role: computes smart route for authenticated crew
 * GET /api/routes/crew/:crewId   — Admin role: computes smart route for any specified crew
 */

const CollectionCrew = require('../models/CollectionCrew');
const PickupRequest = require('../models/PickupRequest');
const { optimizeCrewRoute } = require('../services/routeOptimizer');

/**
 * Helper to resolve the CollectionCrew document for a user
 */
async function resolveCrewForUser(user) {
  // 1. Direct user reference on CollectionCrew
  let crew = await CollectionCrew.findOne({ user: user._id });
  if (crew) return crew;

  // 2. Attached crewProfile on User
  if (user.crewProfile) {
    const profileId = typeof user.crewProfile === 'object' ? user.crewProfile._id || user.crewProfile.id : user.crewProfile;
    if (profileId) {
      crew = await CollectionCrew.findById(profileId);
      if (crew) return crew;
    }
  }

  // 3. Fallback matching by phone
  if (user.phone) {
    crew = await CollectionCrew.findOne({ phone: user.phone });
    if (crew) return crew;
  }

  // 4. Admin preview fallback only
  if (user.role === 'admin') {
    return await CollectionCrew.findOne();
  }

  return null;
}

/**
 * GET /api/routes/my-route
 * Returns the optimized smart route for the authenticated crew member.
 */
async function getMyCrewRoute(req, res, next) {
  try {
    const crew = await resolveCrewForUser(req.user);

    if (!crew) {
      return res.status(404).json({
        success: false,
        message: 'No collection crew profile linked to this account.',
      });
    }

    // Must be approved to view operational route (Part B10, Part I)
    if (crew.verificationStatus && crew.verificationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'This collection crew account has not been approved for route operations.',
      });
    }

    // Fetch active assigned pickups
    const activeRequests = await PickupRequest.find({
      assignedCrew: crew._id,
      status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
    }).populate('resident', 'name phone email');

    const routeData = await optimizeCrewRoute(crew, activeRequests);

    res.json({
      success: true,
      data: routeData,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/routes/crew/:crewId
 * Returns the optimized smart route for any crew (Admin only).
 */
async function getCrewRouteById(req, res, next) {
  try {
    const { crewId } = req.params;

    const crew = await CollectionCrew.findById(crewId);
    if (!crew) {
      return res.status(404).json({
        success: false,
        message: `Collection crew with ID ${crewId} was not found.`,
      });
    }

    // Fetch active assigned pickups
    const activeRequests = await PickupRequest.find({
      assignedCrew: crew._id,
      status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
    }).populate('resident', 'name phone email');

    const routeData = await optimizeCrewRoute(crew, activeRequests);

    res.json({
      success: true,
      data: routeData,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyCrewRoute,
  getCrewRouteById,
};
