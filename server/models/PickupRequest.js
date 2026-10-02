const mongoose = require("mongoose");

const pickupRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      sparse: true,
      default: () => `REQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    },

    // Reference to the User who made this request
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Resident (user) is required"],
    },

    wasteType: {
      type: String,
      enum: ["organic", "plastic", "paper", "glass", "metal", "e-waste", "construction", "mixed", "other"],
      required: [true, "Waste type is required"],
    },

    quantity: {
      type: String,
      enum: ["small", "medium", "large"],
      required: [true, "Quantity is required"],
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    description: {
      type: String,
      trim: true,
    },

    location: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
      },
      address: {
        type: String,
        trim: true,
      },
    },

    // Priority fields — will be calculated by the priority engine in a later phase
    priorityScore: {
      type: Number,
      default: null,
    },
    priorityLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical", "LOW", "MEDIUM", "HIGH", "CRITICAL", null],
      default: null,
    },

    status: {
      type: String,
      enum: ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },

    // Reference to the CollectionCrew assigned to this request
    assignedCrew: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectionCrew",
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

const PickupRequest = mongoose.model("PickupRequest", pickupRequestSchema);

module.exports = PickupRequest;
