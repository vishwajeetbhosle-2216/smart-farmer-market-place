const mongoose = require("mongoose");

// ==========================================
// RETURN REQUEST SCHEMA
// ==========================================

const returnRequestSchema = new mongoose.Schema(
  {
    // --------------------------------------
    // RETURN REQUEST STATUS
    // --------------------------------------

    status: {
      type: String,
      enum: [
        "Requested",
        "Accepted",
        "Disputed",
        "Rejected",
        "Received",
        "Refunded",
      ],
      default: "Requested",
    },

    reason: {
      type: String,
      enum: [
        "Damaged Product",
        "Wrong Product",
        "Poor Quality",
        "Quantity Issue",
        "Other",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    evidenceImage: {
      type: String,
      default: "",
    },

    farmerResponse: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // --------------------------------------
    // PICKUP AND COLLECTION
    // --------------------------------------

    pickupStatus: {
      type: String,
      enum: [
        "Not Scheduled",
        "Scheduled",
        "Collected",
        "Not Required",
      ],
      default: "Not Scheduled",
    },

    pickupScheduledAt: {
      type: Date,
      default: null,
    },

    pickupNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    collectedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // RETURN PICKUP OTP
    // Separate from delivery OTP
    // --------------------------------------

    pickupOtpHash: {
      type: String,
      default: null,
    },

    pickupOtpExpires: {
      type: Date,
      default: null,
    },

    pickupOtpAttempts: {
      type: Number,
      default: 0,
    },

    pickupOtpLastSentAt: {
      type: Date,
      default: null,
    },

    pickupOtpVerifiedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // FARMER INSPECTION
    // --------------------------------------

    inspectionStatus: {
      type: String,
      enum: [
        "Not Inspected",
        "Resellable",
        "Not Resellable",
      ],
      default: "Not Inspected",
    },

    inspectionNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    inspectedAt: {
      type: Date,
      default: null,
    },

    // Prevent duplicate inventory restoration

    stockRestored: {
      type: Boolean,
      default: false,
    },

    stockRestoredAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // REFUND TRACKING
    // --------------------------------------

    refundAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    refundStatus: {
      type: String,
      enum: [
        "Not Applicable",
        "Pending",
        "Processing",
        "Completed",
        "Failed",
      ],
      default: "Not Applicable",
    },

    refundMethod: {
      type: String,
      enum: ["Original Payment", "COD", "Manual"],
      default: "COD",
    },

    refundReference: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    refundNotes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    refundInitiatedAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // ADMIN DISPUTE RESOLUTION
    // --------------------------------------

    adminResolution: {
      type: String,
      enum: [
        "Pending",
        "Buyer Approved",
        "Farmer Approved",
      ],
      default: "Pending",
    },

    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // RETURN TIMESTAMPS
    // --------------------------------------

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

// ==========================================
// ORDER SCHEMA
// ==========================================

const orderSchema = new mongoose.Schema(
  {
    // --------------------------------------
    // BUYER, FARMER AND PRODUCT
    // --------------------------------------

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // --------------------------------------
    // INVOICE SNAPSHOT
    // Permanent details saved when order is placed
    // --------------------------------------

    invoiceSnapshot: {
      invoiceNumber: {
        type: String,
        default: "",
      },

      buyerName: {
        type: String,
        default: "",
      },

      buyerLocation: {
        type: [Number],
        default: [],
      },

      farmerName: {
        type: String,
        default: "",
      },

      farmerLocation: {
        type: [Number],
        default: [],
      },

      productName: {
        type: String,
        default: "",
      },

      productUnit: {
        type: String,
        default: "kg",
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },

    // --------------------------------------
    // ORDER STATUS
    // --------------------------------------

    status: {
      type: String,
      enum: [
        "Pending",
        "Accepted",
        "Rejected",
        "Preparing",
        "Ready",
        "Completed",
      ],
      default: "Pending",
    },

    // Actual delivery completion time.
    // Used to calculate the 6-hour return window.

    completedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // DELIVERY OTP
    // Separate from return pickup OTP
    // --------------------------------------

    deliveryOtpHash: {
      type: String,
      default: null,
    },

    deliveryOtpExpires: {
      type: Date,
      default: null,
    },

    deliveryOtpAttempts: {
      type: Number,
      default: 0,
    },

    deliveryOtpLastSentAt: {
      type: Date,
      default: null,
    },

    deliveryOtpVerifiedAt: {
      type: Date,
      default: null,
    },

    // --------------------------------------
    // PAYMENT
    // --------------------------------------

    paymentMethod: {
      type: String,
      enum: ["COD"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    // --------------------------------------
    // RETURN REQUEST
    // --------------------------------------

    returnRequest: {
      type: returnRequestSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model("Order", orderSchema);