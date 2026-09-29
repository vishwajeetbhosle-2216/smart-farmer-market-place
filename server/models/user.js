const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // MOBILE NUMBER
    // Optional for existing accounts; required during new registration
    // by authController.js
    mobile: {
      type: String,
      trim: true,
      default: undefined,
      validate: {
        validator: function (value) {
          return value == null || /^[6-9]\d{9}$/.test(value);
        },
        message: "Enter a valid 10-digit Indian mobile number.",
      },
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["farmer", "buyer", "admin"],
      default: "buyer",
    },

    // EMAIL VERIFICATION
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailOtpHash: {
      type: String,
      default: null,
    },

    emailOtpExpires: {
      type: Date,
      default: null,
    },

    emailOtpAttempts: {
      type: Number,
      default: 0,
    },

    emailOtpLastSentAt: {
      type: Date,
      default: null,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },

    // PASSWORD RESET
    passwordResetOtpHash: {
      type: String,
      default: null,
    },

    passwordResetOtpExpires: {
      type: Date,
      default: null,
    },

    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
    },

    passwordResetOtpLastSentAt: {
      type: Date,
      default: null,
    },

    // ACCOUNT STATUS
    isActive: {
      type: Boolean,
      default: true,
    },
    locationName: {
  type: String,
  default: "",
  trim: true,
},

    // USER LOCATION
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial index
userSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("User", userSchema);