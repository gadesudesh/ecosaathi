const express = require("express");
const router = express.Router();
const { getAllUsers, getUserById, createUser } = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

// GET  /api/users/test  — smoke test
router.get("/test", (req, res) => {
  res.json({ success: true, message: "User API working" });
});

// GET  /api/users       — all users (admin only)
router.get("/", protect, authorize("admin"), getAllUsers);

// GET  /api/users/:id   — single user (admin only)
router.get("/:id", protect, authorize("admin"), getUserById);

// POST /api/users       — create user (admin only)
router.post("/", protect, authorize("admin"), createUser);

module.exports = router;

