const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── protect ────────────────────────────────────────────────────────────────────
// Reads "Authorization: Bearer <token>", verifies it, and attaches the user to req.user.
// ──────────────────────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorised — no token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Not authorised — token invalid or expired",
      });
    }

    // Attach full user (minus password) to the request
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorised — user no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── authorize ──────────────────────────────────────────────────────────────────
// Must be used AFTER protect.
// authorize("admin")          → admin only
// authorize("admin", "crew")  → admin or crew
// ──────────────────────────────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authorised" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied — requires role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
