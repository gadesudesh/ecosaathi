const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getMyCrewRoute,
  getCrewRouteById,
} = require('../controllers/routeController');

// Crew can only retrieve their own smart route
router.get('/my-route', protect, authorize('crew'), getMyCrewRoute);

// Admin can retrieve the smart route for any crew
router.get('/crew/:crewId', protect, authorize('admin'), getCrewRouteById);

module.exports = router;
