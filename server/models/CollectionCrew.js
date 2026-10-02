const mongoose = require("mongoose");

const collectionCrewSchema = new mongoose.Schema(
  {
    // Link to the User account that belongs to this crew (optional — set during seed/admin setup)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: [true, "Crew name is required"],
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    vehicleNumber: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["AVAILABLE", "BUSY", "OFFLINE"],
      default: "AVAILABLE",
    },

    currentLocation: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },

    // References to PickupRequest documents currently assigned to this crew
    assignedRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PickupRequest",
      },
    ],

    // Simple count of how many jobs this crew has completed
    completedRequests: {
      type: Number,
      default: 0,
    },

    // Verification Workflow Fields (Phase 10)
    verificationStatus: {
      type: String,
      enum: ["PENDING_VERIFICATION", "APPROVED", "REJECTED"],
      default: "PENDING_VERIFICATION",
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

const CollectionCrew = mongoose.model("CollectionCrew", collectionCrewSchema);

module.exports = CollectionCrew;
