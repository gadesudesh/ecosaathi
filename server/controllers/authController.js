const bcrypt        = require("bcryptjs");
const User          = require("../models/User");
const CollectionCrew = require("../models/CollectionCrew");
const generateToken = require("../utils/generateToken");

// Email regex for basic validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── POST /api/auth/register ────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // ── Required field validation ─────────────────────────────────────────────
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // ── Role validation — never trust admin from public registration ───────────
    const allowedPublicRoles = ["resident", "crew"];
    const resolvedRole = role && role !== "" ? role.toLowerCase() : "resident";

    if (!["resident", "crew", "admin"].includes(resolvedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Allowed: resident, crew",
      });
    }

    // Block admin registration through public endpoint
    if (resolvedRole === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be created through public registration",
      });
    }

    // ── Duplicate email check ─────────────────────────────────────────────────
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Create user ───────────────────────────────────────────────────────────
    const user = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: hashedPassword,
      phone:    phone || "",
      role:     resolvedRole,
    });

    let crewProfile = null;
    if (resolvedRole === "crew") {
      try {
        const crewDoc = await CollectionCrew.create({
          user: user._id,
          name: user.name,
          phone: user.phone || "",
          vehicleNumber: req.body.vehicleNumber?.trim() || "MH01-PENDING",
          verificationStatus: "PENDING_VERIFICATION", // Always pending on self-registration
          status: "AVAILABLE",
          currentLocation: { latitude: 19.076, longitude: 72.8777 },
        });
        crewProfile = {
          _id: crewDoc._id,
          id: crewDoc._id,
          name: crewDoc.name,
          status: crewDoc.status,
          vehicleNumber: crewDoc.vehicleNumber,
          verificationStatus: crewDoc.verificationStatus,
        };
      } catch (crewErr) {
        // Rollback user creation to maintain consistency
        await User.findByIdAndDelete(user._id);
        throw new Error(`Failed to initialize crew profile: ${crewErr.message}`);
      }
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: resolvedRole === "crew" 
        ? "Crew account created and submitted for verification" 
        : "Account created successfully",
      data: {
        token,
        user: {
          id:          user._id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          phone:       user.phone,
          crewProfile: crewProfile || undefined,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find the user — include password for comparison
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare submitted password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // For crew users, fetch their linked crew profile including verificationStatus
    let crewProfile = null;
    if (user.role === "crew") {
      crewProfile = await CollectionCrew.findOne({ user: user._id }).select(
        "_id name status vehicleNumber verificationStatus verifiedAt rejectionReason"
      );
      // Fallback: If legacy crew had no verificationStatus, treat as APPROVED
      if (crewProfile && !crewProfile.verificationStatus) {
        crewProfile.verificationStatus = "APPROVED";
      }
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id:          user._id,
          name:        user.name,
          email:       user.email,
          role:        user.role,
          phone:       user.phone,
          crewProfile: crewProfile || undefined,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────────
// Protected route — requires valid JWT in Authorization header
// req.user is set by the protect middleware
const getMe = async (req, res) => {
  try {
    const user = req.user; // already attached by protect middleware

    // For crew users, also return their crew profile with verification fields
    let crewProfile = null;
    if (user.role === "crew") {
      crewProfile = await CollectionCrew.findOne({ user: user._id }).select(
        "_id name status vehicleNumber verificationStatus verifiedAt rejectionReason assignedRequests completedRequests"
      );
      if (crewProfile && !crewProfile.verificationStatus) {
        crewProfile.verificationStatus = "APPROVED";
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        phone:       user.phone,
        crewProfile: crewProfile || undefined,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe };
