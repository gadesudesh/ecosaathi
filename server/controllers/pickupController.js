const mongoose = require("mongoose");
const PickupRequest = require("../models/PickupRequest");
const CollectionCrew = require("../models/CollectionCrew");
const { calculatePriorityScore, getPriorityBreakdown } = require("../utils/priorityCalculator");

// ── Helpers ──────────────────────────────────────────────────────────────────
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Valid status transitions — each status maps to the statuses it may move TO
const VALID_TRANSITIONS = {
  PENDING:     ["ASSIGNED", "CANCELLED"],
  ASSIGNED:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED:   [],   // terminal state
  CANCELLED:   [],   // terminal state
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/requests/stats
// Must be defined BEFORE getRequestById to avoid ":id" capturing "stats"
// ────────────────────────────────────────────────────────────────────────────
const getRequestStats = async (req, res) => {
  try {
    // Status counts
    const statusCounts = await PickupRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const stats = {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      stats.total += count;
      switch (_id) {
        case "PENDING":     stats.pending     = count; break;
        case "ASSIGNED":    stats.assigned    = count; break;
        case "IN_PROGRESS": stats.inProgress  = count; break;
        case "COMPLETED":   stats.completed   = count; break;
        case "CANCELLED":   stats.cancelled   = count; break;
      }
    });

    // Waste type breakdown
    const byWasteType = await PickupRequest.aggregate([
      { $group: { _id: "$wasteType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Priority level breakdown
    const byPriorityLevel = await PickupRequest.aggregate([
      { $match: { priorityLevel: { $ne: null } } },
      { $group: { _id: "$priorityLevel", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Urgency breakdown
    const byUrgency = await PickupRequest.aggregate([
      { $group: { _id: "$urgency", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Crews count
    const activeCrews = await CollectionCrew.countDocuments({ status: { $ne: "OFFLINE" } });
    const totalCrews = await CollectionCrew.countDocuments();

    res.status(200).json({
      success: true,
      message: "Statistics fetched successfully",
      data: {
        ...stats,
        activeCrews,
        totalCrews,
        byWasteType,
        byPriorityLevel,
        byUrgency,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/requests
// Supports ?status ?urgency ?wasteType ?priorityLevel ?sort
// ────────────────────────────────────────────────────────────────────────────
const getAllRequests = async (req, res) => {
  try {
    const { status, urgency, wasteType, priorityLevel, sort } = req.query;

    // Build filter object from query params
    const filter = {};
    if (status)        filter.status        = status.toUpperCase();
    if (urgency)       filter.urgency       = urgency.toLowerCase();
    if (wasteType)     filter.wasteType     = wasteType.toLowerCase();
    if (priorityLevel) filter.priorityLevel = priorityLevel.toUpperCase();

    // ── Role-based data isolation ─────────────────────────────────────────────
    if (req.user) {
      if (req.user.role === "resident") {
        // Residents only see their own requests
        filter.resident = req.user._id;
      } else if (req.user.role === "crew") {
        // Crew only sees requests assigned to their crew profile
        const CollectionCrew = require("../models/CollectionCrew");
        const crewProfile = await CollectionCrew.findOne({ user: req.user._id });
        if (crewProfile) {
          filter.assignedCrew = crewProfile._id;
        } else {
          // Crew user has no linked profile — return empty
          return res.status(200).json({
            success: true,
            message: "No crew profile linked to this account",
            count: 0,
            data: [],
          });
        }
      }
      // admin: no extra filter — sees everything
    }

    // Build sort object
    let sortOption = { createdAt: -1 }; // default: newest first
    if (sort === "priority") sortOption = { priorityScore: -1 };
    if (sort === "oldest")   sortOption = { createdAt:     1  };
    if (sort === "newest")   sortOption = { createdAt:    -1  };

    const requests = await PickupRequest.find(filter)
      .sort(sortOption)
      .populate("resident", "-password")
      .populate("assignedCrew");

    res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ────────────────────────────────────────────────────────────────────────────
// GET /api/requests/:id
// ────────────────────────────────────────────────────────────────────────────
const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }

    const request = await PickupRequest.findById(id)
      .populate("resident", "-password")
      .populate("assignedCrew");

    if (!request) {
      return res.status(404).json({ success: false, message: "Pickup request not found" });
    }

    // RBAC Security Check: Residents can ONLY view their own requests
    if (
      req.user &&
      req.user.role === "resident" &&
      request.resident &&
      request.resident._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to access this request",
      });
    }

    // RBAC Security Check: Crew can ONLY view requests assigned to them
    if (req.user && req.user.role === "crew") {
      const crewProfile = await CollectionCrew.findOne({ user: req.user._id });
      const assignedCrewId = request.assignedCrew?._id || request.assignedCrew;
      if (
        !crewProfile ||
        !assignedCrewId ||
        assignedCrewId.toString() !== crewProfile._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to view this request",
        });
      }
    }

    const dataObj = request.toObject ? request.toObject() : { ...request };
    dataObj.priorityBreakdown = getPriorityBreakdown(request);

    // Sanitize assigned crew details for resident view
    if (req.user && req.user.role === "resident" && dataObj.assignedCrew) {
      dataObj.assignedCrew = {
        _id: dataObj.assignedCrew._id,
        id: dataObj.assignedCrew._id,
        name: dataObj.assignedCrew.name,
        phone: dataObj.assignedCrew.phone || null,
        vehicleNumber: dataObj.assignedCrew.vehicleNumber || null,
        status: dataObj.assignedCrew.status,
      };
    }

    // Sanitize resident details for crew view
    if (req.user && req.user.role === "crew" && dataObj.resident) {
      dataObj.resident = {
        _id: dataObj.resident._id,
        name: dataObj.resident.name,
        phone: dataObj.resident.phone || null,
        address: dataObj.resident.address || null,
      };
    }

    res.status(200).json({
      success: true,
      message: "Request fetched successfully",
      data: dataObj,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/requests
// Create a new pickup request — priority auto-calculated
// ────────────────────────────────────────────────────────────────────────────
const createRequest = async (req, res) => {
  try {
    const { wasteType, quantity, urgency, description, location } = req.body;

    // Resident is always derived from the authenticated user, never from the client body
    const residentId = req.user ? req.user._id : req.body.resident;

    // Required field validation
    if (!residentId || !wasteType || !quantity || !location) {
      return res.status(400).json({
        success: false,
        message: "wasteType, quantity, and location are required",
      });
    }

    if (!isValidObjectId(residentId)) {
      return res.status(400).json({ success: false, message: "Invalid resident ID format" });
    }

    // Residents can only create requests for themselves
    if (req.user && req.user.role === "resident" && req.user._id.toString() !== residentId.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Location validation
    if (
      location.latitude  === undefined ||
      location.longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "location.latitude and location.longitude are required",
      });
    }

    if (location.latitude < -90 || location.latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (location.longitude < -180 || location.longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    // Create the request — status and assignedCrew are NOT accepted from client
    const newRequest = await PickupRequest.create({
      resident:     residentId,
      wasteType,
      quantity,
      urgency:      urgency || "medium",
      description,
      location,
      status:       "PENDING",   // always starts as PENDING
      assignedCrew: null,        // always starts unassigned
    });

    // ── Auto-calculate priority ────────────────────────────────────────────
    const { priorityScore, priorityLevel } = calculatePriorityScore(newRequest);
    newRequest.priorityScore = priorityScore;
    newRequest.priorityLevel = priorityLevel;
    await newRequest.save();

    res.status(201).json({
      success: true,
      message: "Pickup request created successfully",
      data: newRequest,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/requests/:id
// Update basic fields — recalculates priority if relevant fields change
// ────────────────────────────────────────────────────────────────────────────
const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }

    // Whitelist: only these fields can be updated via this endpoint
    const allowed = ["wasteType", "quantity", "urgency", "description", "location"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update. Allowed: wasteType, quantity, urgency, description, location",
      });
    }

    // Location validation if provided
    if (updates.location) {
      const { latitude, longitude } = updates.location;
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        return res.status(400).json({ success: false, message: "Latitude must be between -90 and 90" });
      }
      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        return res.status(400).json({ success: false, message: "Longitude must be between -180 and 180" });
      }
    }

    let request = await PickupRequest.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!request) {
      return res.status(404).json({ success: false, message: "Pickup request not found" });
    }

    // Recalculate priority if urgency, quantity, or wasteType changed
    if (updates.urgency || updates.quantity || updates.wasteType) {
      const { priorityScore, priorityLevel } = calculatePriorityScore(request);
      request.priorityScore = priorityScore;
      request.priorityLevel = priorityLevel;
      await request.save();
    }

    res.status(200).json({
      success: true,
      message: "Request updated successfully",
      data: request,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/requests/:id
// ────────────────────────────────────────────────────────────────────────────
const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }

    const request = await PickupRequest.findByIdAndDelete(id);

    if (!request) {
      return res.status(404).json({ success: false, message: "Pickup request not found" });
    }

    res.status(200).json({
      success: true,
      message: "Pickup request deleted successfully",
      data: { deletedId: id },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/requests/:id/status
// Change status with transition validation
// ────────────────────────────────────────────────────────────────────────────
const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }

    if (!status) {
      return res.status(400).json({ success: false, message: "status field is required" });
    }

    const newStatus = status.toUpperCase();

    if (!VALID_TRANSITIONS[newStatus] === undefined) {
      return res.status(400).json({
        success: false,
        message: `Invalid status: ${status}. Allowed: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED`,
      });
    }

    const request = await PickupRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Pickup request not found" });
    }

    // ── RBAC & Assignment Verification for Crew ──────────────────────────
    let crew = null;
    if (req.user && req.user.role === "crew") {
      crew = await CollectionCrew.findOne({ user: req.user._id });
      if (
        !crew ||
        !request.assignedCrew ||
        request.assignedCrew.toString() !== crew._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to manage this pickup",
        });
      }

      if (crew.verificationStatus && crew.verificationStatus !== "APPROVED") {
        return res.status(403).json({
          success: false,
          message: "Your collection crew account has not been approved for operations.",
        });
      }

      // Check specific workflow state constraints for crew
      if (newStatus === "IN_PROGRESS" && request.status !== "ASSIGNED") {
        return res.status(400).json({
          success: false,
          message: `Cannot start collection. Current status is ${request.status}, must be ASSIGNED.`,
        });
      }

      if (newStatus === "COMPLETED" && request.status !== "IN_PROGRESS") {
        return res.status(400).json({
          success: false,
          message: `Cannot complete collection. Current status is ${request.status}, must be IN_PROGRESS.`,
        });
      }
    }

    // Validate transition
    const allowedNext = VALID_TRANSITIONS[request.status] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: ${request.status} → ${newStatus}. Allowed next statuses: [${allowedNext.join(", ") || "none"}]`,
      });
    }

    request.status = newStatus;

    // ── Handle IN_PROGRESS transition: Crew becomes BUSY ──────────────────
    if (newStatus === "IN_PROGRESS") {
      const crewId = request.assignedCrew || crew?._id;
      if (crewId) {
        await CollectionCrew.findByIdAndUpdate(crewId, { status: "BUSY" });
      }
    }

    // ── Handle COMPLETED transition ────────────────────────────────────────
    if (newStatus === "COMPLETED") {
      const crewId = request.assignedCrew || crew?._id;
      if (crewId) {
        const assignedCrewObj = await CollectionCrew.findById(crewId);
        if (assignedCrewObj) {
          // Remove this request from active assignedRequests list
          assignedCrewObj.assignedRequests = assignedCrewObj.assignedRequests.filter(
            (rid) => rid.toString() !== request._id.toString()
          );
          assignedCrewObj.completedRequests = (assignedCrewObj.completedRequests || 0) + 1;

          // Check if any active requests (ASSIGNED or IN_PROGRESS) remain for this crew
          const remainingActive = await PickupRequest.countDocuments({
            _id: { $ne: request._id },
            assignedCrew: crewId,
            status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
          });

          if (remainingActive === 0) {
            assignedCrewObj.status = "AVAILABLE";
          }

          await assignedCrewObj.save();
        }
      }
    }

    await request.save();

    res.status(200).json({
      success: true,
      message: `Request status updated to ${newStatus}`,
      data: request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/requests/:requestId/assign
// Assign a pickup request to a collection crew
// ────────────────────────────────────────────────────────────────────────────
const assignRequestToCrew = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { crewId } = req.body;

    if (!isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }

    if (!crewId) {
      return res.status(400).json({ success: false, message: "crewId is required" });
    }

    if (!isValidObjectId(crewId)) {
      return res.status(400).json({ success: false, message: "Invalid crew ID format" });
    }

    const request = await PickupRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Pickup request not found" });
    }

    if (request.status === "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Cannot reassign a pickup that is currently IN_PROGRESS",
      });
    }

    if (request.status === "COMPLETED" || request.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: `Cannot assign a request that is already ${request.status}`,
      });
    }

    const crew = await CollectionCrew.findById(crewId);
    if (!crew) {
      return res.status(404).json({ success: false, message: "Collection crew not found" });
    }

    // Only APPROVED crews can receive assignments (Part D1)
    if (crew.verificationStatus && crew.verificationStatus !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "This collection crew has not been approved for assignments.",
      });
    }

    // If already assigned to this exact crew, return early
    if (request.assignedCrew && request.assignedCrew.toString() === crewId && request.status === "ASSIGNED") {
      const alreadyPopulated = await PickupRequest.findById(requestId)
        .populate("resident", "-password")
        .populate("assignedCrew");
      return res.status(200).json({
        success: true,
        message: `Request is already assigned to ${crew.name}`,
        data: alreadyPopulated,
      });
    }

    // Unassign from previous crew if this request was already assigned
    if (request.assignedCrew && request.assignedCrew.toString() !== crewId) {
      const prevCrew = await CollectionCrew.findById(request.assignedCrew);
      if (prevCrew) {
        prevCrew.assignedRequests = prevCrew.assignedRequests.filter(
          (rid) => rid.toString() !== requestId
        );
        const remainingForPrev = await PickupRequest.countDocuments({
          _id: { $ne: requestId },
          assignedCrew: prevCrew._id,
          status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
        });
        if (remainingForPrev === 0) {
          prevCrew.status = "AVAILABLE";
        }
        await prevCrew.save();
      }
    }

    // Update the request
    request.assignedCrew = crewId;
    request.status = "ASSIGNED";
    await request.save();

    // Update the crew — avoid duplicate IDs in assignedRequests
    const alreadyInList = crew.assignedRequests.some(
      (rid) => rid.toString() === requestId
    );
    if (!alreadyInList) {
      crew.assignedRequests.push(requestId);
    }
    crew.status = "BUSY";
    await crew.save();

    // Return populated request
    const populated = await PickupRequest.findById(requestId)
      .populate("resident", "-password")
      .populate("assignedCrew");

    res.status(200).json({
      success: true,
      message: `Request assigned to ${crew.name} successfully`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/requests/:id/cancel
// Allows resident owner (or admin) to cancel a PENDING or ASSIGNED request
// ────────────────────────────────────────────────────────────────────────────
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid request ID format" });
    }

    const request = await PickupRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Pickup request not found" });
    }

    // Must be request owner (if resident) or admin
    if (
      req.user &&
      req.user.role === "resident" &&
      request.resident.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this request",
      });
    }

    // Only allow cancellation if status is PENDING or ASSIGNED
    if (!["PENDING", "ASSIGNED"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request with status ${request.status}. Only PENDING or ASSIGNED requests can be cancelled.`,
      });
    }

    // If assigned to crew, unassign and update crew active count
    if (request.assignedCrew) {
      const crew = await CollectionCrew.findById(request.assignedCrew);
      if (crew) {
        crew.assignedRequests = crew.assignedRequests.filter(
          (rid) => rid.toString() !== request._id.toString()
        );
        if (crew.assignedRequests.length === 0 && crew.status === "BUSY") {
          crew.status = "AVAILABLE";
        }
        await crew.save();
      }
      request.assignedCrew = null;
    }

    request.status = "CANCELLED";
    await request.save();

    const populated = await PickupRequest.findById(request._id)
      .populate("resident", "-password")
      .populate("assignedCrew");

    res.status(200).json({
      success: true,
      message: "Pickup request cancelled successfully",
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRequestStats,
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  deleteRequest,
  updateRequestStatus,
  assignRequestToCrew,
  cancelRequest,
};

