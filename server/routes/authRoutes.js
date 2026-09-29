const express = require("express");

const {
  registerUser,
  loginUser,
  verifyEmailOtp,
  resendEmailOtp,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

// Registration
router.post("/register", registerUser);

// Email verification
router.post("/verify-email", verifyEmailOtp);

// Resend verification OTP
router.post("/resend-otp", resendEmailOtp);

// Login
router.post("/login", loginUser);

// Forgot password
router.post("/forgot-password", forgotPassword);

// Reset password
router.post("/reset-password", resetPassword);

module.exports = router;