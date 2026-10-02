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
    crew = await CollectionCrew.findById(user.crewProfile);
    if (crew) return crew;
  }

  // 3. Fallback matching by phone or name
  if (user.phone) {
    crew = await CollectionCrew.findOne({ phone: user.phone });
    if (crew) return crew;
  }

  // 4. Default to first crew if running in demo environment
  return await CollectionCrew.findOne();
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
