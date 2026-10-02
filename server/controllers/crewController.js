const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const CollectionCrew = require("../models/CollectionCrew");
const PickupRequest = require("../models/PickupRequest");
const User = require("../models/User");

// ── Helper ────────────────────────────────────────────────────────────────────
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/crews
// Supports ?verificationStatus=APPROVED | PENDING_VERIFICATION | REJECTED
// ────────────────────────────────────────────────────────────────────────────
const getAllCrews = async (req, res) => {
  try {
    const { verificationStatus } = req.query;
    const filter = {};

    if (verificationStatus) {
      if (verificationStatus.toUpperCase() === "APPROVED") {
        // Backwards compatibility for legacy seeded crews
        filter.$or = [
          { verificationStatus: "APPROVED" },
          { verificationStatus: { $exists: false } },
          { verificationStatus: null },
        ];
      } else {
        filter.verificationStatus = verificationStatus.toUpperCase();
      }
    }

    const crews = await CollectionCrew.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email phone role")
      .populate("verifiedBy", "name email")
      .populate("assignedRequests");

    // Ensure verificationStatus is normalized on each record
    const normalized = crews.map((c) => {
      const obj = c.toObject ? c.toObject() : c;
      if (!obj.verificationStatus) {
        obj.verificationStatus = "APPROVED";
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      message: "Crews fetched successfully",
      count: normalized.length,
      data: normalized,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/crews/:id
// ────────────────────────────────────────────────────────────────────────────
const getCrewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid crew ID format" });
    }

    const crew = await CollectionCrew.findById(id)
      .populate("user", "name email phone role")
      .populate("verifiedBy", "name email")
      .populate("assignedRequests");

    if (!crew) {
      return res.status(404).json({ success: false, message: "Collection crew not found" });
    }

    const obj = crew.toObject ? crew.toObject() : crew;
    if (!obj.verificationStatus) {
      obj.verificationStatus = "APPROVED";
    }

    res.status(200).json({
      success: true,
      message: "Crew fetched successfully",
      data: obj,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/crews (Admin-created crew: immediately APPROVED)
// ────────────────────────────────────────────────────────────────────────────
const createCrew = async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber, status, currentLocation } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Crew name is required" });
    }

    // Status validation
    const allowedStatuses = ["AVAILABLE", "BUSY", "OFFLINE"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    // Location validation if provided
    if (currentLocation) {
      const { latitude, longitude } = currentLocation;
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({ success: false, message: "Latitude must be between -90 and 90" });
      }
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({ success: false, message: "Longitude must be between -180 and 180" });
      }
    }

    let linkedUser = null;
    // If email provided, create or link User account
    if (email && email.trim()) {
      const cleanEmail = email.toLowerCase().trim();
      let existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        if (existingUser.role !== "crew") {
          return res.status(400).json({
            success: false,
            message: `User with email ${cleanEmail} exists with role '${existingUser.role}'. Cannot link as crew.`,
          });
        }
        linkedUser = existingUser;
      } else {
        const rawPassword = password || "crew123";
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(rawPassword, salt);
        linkedUser = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          phone: phone || "",
          role: "crew",
        });
      }
    }

    // Admin created crew is APPROVED immediately
    const crew = await CollectionCrew.create({
      user: linkedUser ? linkedUser._id : null,
      name: name.trim(),
      phone: phone || linkedUser?.phone || "",
      vehicleNumber: vehicleNumber?.trim() || "MH01-FLEET",
      status: status || "AVAILABLE",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      verifiedBy: req.user ? req.user._id : null,
      currentLocation: currentLocation || { latitude: 19.076, longitude: 72.8777 },
    });

    const populated = await CollectionCrew.findById(crew._id)
      .populate("user", "name email phone role")
      .populate("assignedRequests");

    res.status(201).json({
      success: true,
      message: "Collection crew created and approved successfully",
      data: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/crews/:id
// ────────────────────────────────────────────────────────────────────────────
const updateCrew = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid crew ID format" });
    }

    // Whitelist updateable fields
    const allowed = ["name", "phone", "vehicleNumber", "status", "currentLocation"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update. Allowed: name, phone, vehicleNumber, status, currentLocation",
      });
    }

    // Status validation
    if (updates.status) {
      const allowedStatuses = ["AVAILABLE", "BUSY", "OFFLINE"];
      if (!allowedStatuses.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}`,
        });
      }
    }

    // Location validation
    if (updates.currentLocation) {
      const { latitude, longitude } = updates.currentLocation;
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({ success: false, message: "Latitude must be between -90 and 90" });
      }
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({ success: false, message: "Longitude must be between -180 and 180" });
      }
    }

    const crew = await CollectionCrew.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!crew) {
      return res.status(404).json({ success: false, message: "Collection crew not found" });
    }

    res.status(200).json({
      success: true,
      message: "Crew updated successfully",
      data: crew,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/crews/:id/requests
// Return all active requests assigned to this crew, sorted by priority
// ────────────────────────────────────────────────────────────────────────────
const getCrewRequests = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid crew ID format" });
    }

    const crew = await CollectionCrew.findById(id);
    if (!crew) {
      return res.status(404).json({ success: false, message: "Collection crew not found" });
    }

    // Fetch active (non-completed/cancelled) requests assigned to this crew
    const requests = await PickupRequest.find({
      assignedCrew: id,
      status: { $nin: ["COMPLETED", "CANCELLED"] },
    })
      .sort({ priorityScore: -1 })  // highest priority first
      .populate("resident", "-password");

    res.status(200).json({
      success: true,
      message: `Active requests for crew: ${crew.name}`,
      crew: { id: crew._id, name: crew.name, status: crew.status },
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/crews/:id/verify
// Admin verification endpoint: Approve or Reject a crew application
// ────────────────────────────────────────────────────────────────────────────
const verifyCrew = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid crew ID format" });
    }

    if (!status || !["APPROVED", "REJECTED"].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Status must be either APPROVED or REJECTED",
      });
    }

    const nextVerificationStatus = status.toUpperCase();

    const crew = await CollectionCrew.findById(id);
    if (!crew) {
      return res.status(404).json({ success: false, message: "Collection crew not found" });
    }

    crew.verificationStatus = nextVerificationStatus;
    crew.verifiedAt = new Date();
    crew.verifiedBy = req.user ? req.user._id : null;

    if (nextVerificationStatus === "APPROVED") {
      crew.rejectionReason = null;
      if (crew.status === "OFFLINE" || !crew.status) {
        crew.status = "AVAILABLE";
      }
    } else {
      crew.rejectionReason = rejectionReason?.trim() || "Application not approved by administrator";
    }

    await crew.save();

    const updated = await CollectionCrew.findById(id)
      .populate("user", "name email phone role")
      .populate("verifiedBy", "name email")
      .populate("assignedRequests");

    res.status(200).json({
      success: true,
      message:
        nextVerificationStatus === "APPROVED"
          ? "Crew member approved successfully."
          : "Crew application rejected.",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllCrews,
  getCrewById,
  createCrew,
  updateCrew,
  getCrewRequests,
  verifyCrew,
};
