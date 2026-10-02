const express = require("express");
const router  = express.Router();
const {
  getRequestStats,
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  updateRequestStatus,
  assignRequestToCrew,
  cancelRequest,
} = require("../controllers/pickupController");
const { protect, authorize } = require("../middleware/authMiddleware");

// IMPORTANT: /stats must be declared BEFORE /:id

// GET  /api/requests/test  — smoke test
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Pickup Request API working" });
});

// GET  /api/requests/stats — dashboard statistics (admin & crew)
router.get("/stats", protect, authorize("admin", "crew"), getRequestStats);

// GET  /api/requests       — role-filtered list
router.get("/", protect, getAllRequests);

// GET  /api/requests/:id   — single request
router.get("/:id", protect, getRequestById);

// POST /api/requests       — create request (residents + admin)
router.post("/", protect, authorize("resident", "admin"), createRequest);

// PATCH /api/requests/:id           — update basic fields (admin only)
router.patch("/:id", protect, authorize("admin"), updateRequest);

// DELETE /api/requests/:id          — delete request (admin only)
router.delete("/:id", protect, authorize("admin"), deleteRequest);

// PATCH /api/requests/:id/status    — change status (crew + admin)
router.patch("/:id/status", protect, authorize("crew", "admin"), updateRequestStatus);

// PATCH /api/requests/:id/cancel    — cancel request (resident owner + admin)
router.patch("/:id/cancel", protect, authorize("resident", "admin"), cancelRequest);

// PATCH /api/requests/:requestId/assign — assign to crew (admin only)
router.patch("/:requestId/assign", protect, authorize("admin"), assignRequestToCrew);

module.exports = router;
