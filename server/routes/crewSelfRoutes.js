const express = require("express");
const router = express.Router();
const {
  getMyCrewProfile,
  getMyCrewRequests,
  updateMyCrewStatus,
} = require("../controllers/crewSelfController");
const { protect, authorize } = require("../middleware/authMiddleware");

// All routes under /api/crew require authenticated crew or admin
router.use(protect, authorize("crew", "admin"));

// GET /api/crew/profile — Authenticated crew profile
router.get("/profile", getMyCrewProfile);

// GET /api/crew/requests — Authenticated crew assigned requests
router.get("/requests", getMyCrewRequests);

// PATCH /api/crew/status — Update crew status (AVAILABLE, BUSY, OFFLINE)
router.patch("/status", updateMyCrewStatus);

module.exports = router;
