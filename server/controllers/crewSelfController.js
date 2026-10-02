const CollectionCrew = require("../models/CollectionCrew");
const PickupRequest = require("../models/PickupRequest");

// Priority rank order for sorting
const PRIORITY_ORDER = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * GET /api/crew/profile
 * Returns the CollectionCrew profile linked to the authenticated crew user.
 */
const getMyCrewProfile = async (req, res) => {
  try {
    let crew = null;

    if (req.user.role === "crew") {
      crew = await CollectionCrew.findOne({ user: req.user._id });
    } else if (req.user.role === "admin") {
      // For admin previewing crew dashboard, return the first available crew
      crew = await CollectionCrew.findOne().sort({ createdAt: 1 });
    }

    if (!crew) {
      return res.status(404).json({
        success: false,
        message: "No collection crew profile linked to this account.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Crew profile retrieved successfully",
      data: crew,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/crew/requests
 * Returns all requests assigned to the authenticated crew.
 * Sorted:
 *   1. IN_PROGRESS active request
 *   2. CRITICAL priority
 *   3. HIGH priority
 *   4. MEDIUM priority
 *   5. LOW priority
 *   6. Older requests first (createdAt ascending)
 */
const getMyCrewRequests = async (req, res) => {
  try {
    let crew = null;

    if (req.user.role === "crew") {
      crew = await CollectionCrew.findOne({ user: req.user._id });
    } else if (req.user.role === "admin") {
      crew = await CollectionCrew.findOne().sort({ createdAt: 1 });
    }

    if (!crew) {
      return res.status(200).json({
        success: true,
        message: "No collection crew profile linked to this account.",
        count: 0,
        crew: null,
        data: [],
      });
    }

    // Only approved crews can access assigned pickups (Part B8, B10)
    if (crew.verificationStatus && crew.verificationStatus !== "APPROVED") {
      return res.status(200).json({
        success: true,
        message: "Your crew account is awaiting administrator approval.",
        count: 0,
        crew: {
          _id: crew._id,
          name: crew.name,
          phone: crew.phone,
          vehicleNumber: crew.vehicleNumber,
          status: crew.status,
          verificationStatus: crew.verificationStatus,
          rejectionReason: crew.rejectionReason,
        },
        data: [],
      });
    }

    // Find all requests assigned to this crew (ASSIGNED, IN_PROGRESS, COMPLETED)
    const requests = await PickupRequest.find({ assignedCrew: crew._id })
      .populate("resident", "name email phone address")
      .lean();

    // Sort according to crew requirements
    requests.sort((a, b) => {
      // 1. IN_PROGRESS comes first
      if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
      if (b.status === "IN_PROGRESS" && a.status !== "IN_PROGRESS") return 1;

      // 2. Active (ASSIGNED) before COMPLETED / CANCELLED
      const aIsActive = a.status === "ASSIGNED";
      const bIsActive = b.status === "ASSIGNED";
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // 3. Priority order
      const aRank = PRIORITY_ORDER[a.priorityLevel] || 0;
      const bRank = PRIORITY_ORDER[b.priorityLevel] || 0;
      if (bRank !== aRank) {
        return bRank - aRank; // higher priority first
      }

      // 4. Older requests before newer requests (waiting longer)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    res.status(200).json({
      success: true,
      message: `Assigned requests for crew ${crew.name}`,
      crew: {
        _id: crew._id,
        name: crew.name,
        phone: crew.phone,
        vehicleNumber: crew.vehicleNumber,
        status: crew.status,
        currentLocation: crew.currentLocation,
        completedRequests: crew.completedRequests,
      },
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/crew/status
 * Allows the crew to update their status (AVAILABLE, BUSY, OFFLINE).
 * Prevents manually setting to AVAILABLE while having an IN_PROGRESS task.
 */
const updateMyCrewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["AVAILABLE", "BUSY", "OFFLINE"];

    if (!status || !allowed.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${allowed.join(", ")}`,
      });
    }

    const newStatus = status.toUpperCase();

    let crew = null;
    if (req.user.role === "crew") {
      crew = await CollectionCrew.findOne({ user: req.user._id });
    } else if (req.user.role === "admin") {
      crew = await CollectionCrew.findOne().sort({ createdAt: 1 });
    }

    if (!crew) {
      return res.status(404).json({
        success: false,
        message: "No collection crew profile linked to this account.",
      });
    }

    if (crew.verificationStatus && crew.verificationStatus !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Your crew account has not been approved for operations yet.",
      });
    }

    // Business rule: Do not allow manually setting to AVAILABLE while an IN_PROGRESS task exists
    if (newStatus === "AVAILABLE") {
      const activeInProgress = await PickupRequest.countDocuments({
        assignedCrew: crew._id,
        status: "IN_PROGRESS",
      });

      if (activeInProgress > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot set status to AVAILABLE while a collection is currently IN_PROGRESS.",
        });
      }
    }

    crew.status = newStatus;
    await crew.save();

    res.status(200).json({
      success: true,
      message: `Crew status updated to ${newStatus}`,
      data: crew,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyCrewProfile,
  getMyCrewRequests,
  updateMyCrewStatus,
};
