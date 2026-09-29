const express = require("express");
const router = express.Router();

const User = require("../models/user");
const protect = require("../middleware/authMiddleware");

// SAVE BUYER LOCATION
router.put("/location", protect, async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      locationName,
    } = req.body;

    // Validate coordinates
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required",
      });
    }

    const user = await User.findById(
      req.user.userId
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Save GeoJSON coordinates as [longitude, latitude]
    user.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };

    // Save readable location name
    user.locationName =
      typeof locationName === "string"
        ? locationName.trim()
        : "";

    await user.save();

    return res.status(200).json({
      message: "Location saved successfully",
      locationName: user.locationName,
      latitude,
      longitude,
    });
  } catch (error) {
    console.error("Save location error:", error);

    return res.status(500).json({
      message: "Failed to save location",
    });
  }
});

module.exports = router;