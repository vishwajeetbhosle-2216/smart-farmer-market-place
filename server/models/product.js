const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      enum: ["Vegetables", "Fruits", "Flowers"],
      required: true,
      trim: true,
    },

    pricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },

    quantityAvailable: {
      type: Number,
      required: true,
      min: 0,
    },

    unit: {
      type: String,
      default: "kg",
    },

    /* =========================
       PRODUCT IMAGE
    ========================= */

    image: {
      type: String,
      default: "",
    },

    /* =========================
       SHELF-LIFE MANAGEMENT
    ========================= */

    harvestDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["Active", "Expired", "SoldOut"],
      default: "Active",
    },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /* =========================
       FARMER
    ========================= */

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* =========================
       PRODUCT LOCATION
    ========================= */

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },

  {
    timestamps: true,
  }
);

/* =========================
   GEOLOCATION INDEX
========================= */

productSchema.index({
  location: "2dsphere",
});

const Product = mongoose.model(
  "Product",
  productSchema
);

module.exports = Product;