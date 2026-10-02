const express = require("express");
const router  = express.Router();
const {
  getAllCrews,
  getCrewById,
  createCrew,
  updateCrew,
  getCrewRequests,
  verifyCrew,
} = require("../controllers/crewController");
const { protect, authorize } = require("../middleware/authMiddleware");

// GET  /api/crews/test — smoke test
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Collection Crew API working" });
});

// GET  /api/crews           — all crews (admin + crew)
router.get("/", protect, authorize("admin", "crew"), getAllCrews);

// GET  /api/crews/:id       — single crew (admin + crew)
router.get("/:id", protect, authorize("admin", "crew"), getCrewById);

// POST /api/crews           — create crew (admin only)
router.post("/", protect, authorize("admin"), createCrew);

// PATCH /api/crews/:id/verify — approve or reject crew application (admin only)
router.patch("/:id/verify", protect, authorize("admin"), verifyCrew);

// PATCH /api/crews/:id      — update crew (admin only)
router.patch("/:id", protect, authorize("admin"), updateCrew);

// GET  /api/crews/:id/requests — active requests for this crew (admin + crew)
router.get("/:id/requests", protect, authorize("admin", "crew"), getCrewRequests);

module.exports = router;
