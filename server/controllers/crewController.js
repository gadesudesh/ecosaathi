const mongoose = require("mongoose");
const CollectionCrew = require("../models/CollectionCrew");
const PickupRequest = require("../models/PickupRequest");

// ── Helper ────────────────────────────────────────────────────────────────────
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/crews
// ────────────────────────────────────────────────────────────────────────────
const getAllCrews = async (req, res) => {
  try {
    const crews = await CollectionCrew.find()
      .sort({ createdAt: -1 })
      .populate("assignedRequests");

    res.status(200).json({
      success: true,
      message: "Crews fetched successfully",
      count: crews.length,
      data: crews,
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

    const crew = await CollectionCrew.findById(id).populate("assignedRequests");
    if (!crew) {
      return res.status(404).json({ success: false, message: "Collection crew not found" });
    }

    res.status(200).json({
      success: true,
      message: "Crew fetched successfully",
      data: crew,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/crews
// ────────────────────────────────────────────────────────────────────────────
const createCrew = async (req, res) => {
  try {
    const { name, phone, vehicleNumber, status, currentLocation } = req.body;

    if (!name) {
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

    const crew = await CollectionCrew.create({
      name,
      phone,
      vehicleNumber,
      status: status || "AVAILABLE",
      currentLocation,
    });

    res.status(201).json({
      success: true,
      message: "Collection crew created successfully",
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

module.exports = { getAllCrews, getCrewById, createCrew, updateCrew, getCrewRequests };
