const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Email transporter using SMTP credentials from .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hash OTP before saving it in MongoDB
const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

// Generate and send a new email OTP
const sendEmailOtp = async (user) => {
  const now = Date.now();

  // Prevent repeated OTP requests within 60 seconds
  if (
    user.emailOtpLastSentAt &&
    now - new Date(user.emailOtpLastSentAt).getTime() < 60000
  ) {
    return {
      success: false,
      message: "Please wait 60 seconds before requesting another OTP",
    };
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  user.emailOtpHash = hashOtp(otp);
  user.emailOtpExpires = new Date(now + 10 * 60 * 1000);
  user.emailOtpAttempts = 0;
  user.emailOtpLastSentAt = new Date(now);

  await user.save();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: user.email,
    subject: "Smart Farmer Marketplace - Email Verification",
    text: `Hello ${user.name},

Your email verification OTP is: ${otp}

This OTP is valid for 10 minutes.

If you did not request this, please ignore this email.

Smart Farmer Marketplace`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Smart Farmer Marketplace</h2>
        <p>Hello ${user.name},</p>
        <p>Use the OTP below to verify your email address:</p>
        <h1 style="letter-spacing: 8px; color: #218838;">${otp}</h1>
        <p>This OTP is valid for <b>10 minutes</b>.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  });

  return {
    success: true,
    message: "OTP sent to your email address",
  };
};

// REGISTER USER
const registerUser = async (req, res) => {
  try {
    const { name, email,mobile, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Only allow buyer or farmer self-registration
    const selectedRole = role || "buyer";

    if (!["buyer", "farmer"].includes(selectedRole)) {
      return res.status(400).json({
        message: "Invalid role. Please register as buyer or farmer",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      if (existingUser.isEmailVerified === true) {
        return res.status(400).json({
          message: "Email is already registered. Please log in",
        });
      }

      // Existing unverified account: resend OTP
      const otpResult = await sendEmailOtp(existingUser);

      if (!otpResult.success) {
        return res.status(429).json({
          message: otpResult.message,
        });
      }

      return res.status(200).json({
        message: "Account already exists but is not verified. OTP sent",
        email: existingUser.email,
        requiresVerification: true,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
  name: name.trim(),
  email: normalizedEmail,
  mobile: mobile ? mobile.trim() : undefined,
  password: hashedPassword,
  role: selectedRole,
  isEmailVerified: false,
});

    try {
      const otpResult = await sendEmailOtp(user);

      if (!otpResult.success) {
        return res.status(429).json({
          message: otpResult.message,
        });
      }
    } catch (emailError) {
      console.error("OTP email error:", emailError);

      // Keep account unverified so OTP can be resent later
      return res.status(500).json({
        message:
          "Account created, but OTP email could not be sent. Please try resending OTP",
        email: user.email,
        requiresVerification: true,
      });
    }

    return res.status(201).json({
      message: "Registration successful. Please verify your email using the OTP",
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Server error during registration",
    });
  }
};

// VERIFY EMAIL OTP
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Please provide email and OTP",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    if (user.isEmailVerified === true) {
      return res.status(200).json({
        message: "Email is already verified. Please log in",
      });
    }

    if (!user.emailOtpHash || !user.emailOtpExpires) {
      return res.status(400).json({
        message: "No active OTP found. Please request a new OTP",
      });
    }

    if (new Date(user.emailOtpExpires).getTime() < Date.now()) {
      user.emailOtpHash = null;
      user.emailOtpExpires = null;
      user.emailOtpAttempts = 0;
      await user.save();

      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP",
      });
    }

    if (user.emailOtpAttempts >= 5) {
      user.emailOtpHash = null;
      user.emailOtpExpires = null;
      await user.save();

      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new OTP",
      });
    }

    const submittedOtpHash = hashOtp(String(otp).trim());

    if (submittedOtpHash !== user.emailOtpHash) {
      user.emailOtpAttempts += 1;
      await user.save();

      return res.status(400).json({
        message: "Invalid OTP",
        attemptsRemaining: Math.max(0, 5 - user.emailOtpAttempts),
      });
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();

    // Clear OTP after successful verification
    user.emailOtpHash = null;
    user.emailOtpExpires = null;
    user.emailOtpAttempts = 0;
    user.emailOtpLastSentAt = null;

    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. You can now log in",
      emailVerified: true,
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      message: "Server error during email verification",
    });
  }
};

// RESEND EMAIL OTP
const resendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide email",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Generic response avoids revealing whether an account exists
    if (!user) {
      return res.status(200).json({
        message: "If the account exists, an OTP will be sent",
      });
    }

    if (user.isEmailVerified === true) {
      return res.status(200).json({
        message: "Email is already verified. Please log in",
      });
    }

    const otpResult = await sendEmailOtp(user);

    if (!otpResult.success) {
      return res.status(429).json({
        message: otpResult.message,
      });
    }

    return res.status(200).json({
      message: "A new OTP has been sent to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      message: "Could not resend OTP",
    });
  }
};

// LOGIN USER
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is inactive. Please contact support",
      });
    }

    // Require email verification before issuing JWT
    if (user.isEmailVerified !== true) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login",
    });
  }
};
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please provide your email address",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Generic response to avoid revealing account existence
    if (!user || user.isEmailVerified !== true) {
      return res.status(200).json({
        message:
          "If a verified account exists, a password reset OTP will be sent",
      });
    }

    const now = Date.now();

    // 60-second resend cooldown
    if (
      user.passwordResetOtpLastSentAt &&
      now -
        new Date(user.passwordResetOtpLastSentAt).getTime() <
        60000
    ) {
      return res.status(429).json({
        message:
          "Please wait 60 seconds before requesting another reset OTP",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpires = new Date(
      now + 10 * 60 * 1000
    );
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpLastSentAt = new Date(now);

    await user.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: "Smart Farmer Marketplace - Password Reset OTP",
        text: `Hello ${user.name},

Your password reset OTP is: ${otp}

This OTP is valid for 10 minutes.

If you did not request a password reset, please ignore this email.

Smart Farmer Marketplace`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
            <h2>Smart Farmer Marketplace</h2>
            <p>Hello ${user.name},</p>
            <p>Use this OTP to reset your password:</p>
            <h1 style="letter-spacing: 8px; color: #218838;">
              ${otp}
            </h1>
            <p>This OTP is valid for <b>10 minutes</b>.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Password reset email error:", emailError);

      // Invalidate the OTP if email delivery fails
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetOtpAttempts = 0;
      user.passwordResetOtpLastSentAt = null;

      await user.save();

      return res.status(500).json({
        message: "Could not send reset OTP. Please try again later",
      });
    }

    return res.status(200).json({
      message: "If a verified account exists, a password reset OTP will be sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Server error while requesting password reset",
    });
  }
};


// RESET PASSWORD
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "Please provide email, OTP and new password",
      });
    }

    if (!/^\d{6}$/.test(String(otp).trim())) {
      return res.status(400).json({
        message: "Please enter a valid 6-digit OTP",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.isEmailVerified !== true) {
      return res.status(400).json({
        message: "Invalid reset request",
      });
    }

    if (
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpires
    ) {
      return res.status(400).json({
        message: "No active reset OTP. Please request a new one",
      });
    }

    if (
      new Date(user.passwordResetOtpExpires).getTime() <
      Date.now()
    ) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetOtpAttempts = 0;

      await user.save();

      return res.status(400).json({
        message: "Reset OTP has expired. Please request a new one",
      });
    }

    if (user.passwordResetOtpAttempts >= 5) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpires = null;
      user.passwordResetOtpAttempts = 0;

      await user.save();

      return res.status(429).json({
        message: "Too many attempts. Please request a new OTP",
      });
    }

    const submittedOtpHash = hashOtp(
      String(otp).trim()
    );

    if (submittedOtpHash !== user.passwordResetOtpHash) {
      user.passwordResetOtpAttempts += 1;

      await user.save();

      return res.status(400).json({
        message: "Invalid reset OTP",
        attemptsRemaining: Math.max(
          0,
          5 - user.passwordResetOtpAttempts
        ),
      });
    }

    // Hash the new password before saving
    user.password = await bcrypt.hash(newPassword, 10);

    // Clear reset OTP after successful password change
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpires = null;
    user.passwordResetOtpAttempts = 0;
    user.passwordResetOtpLastSentAt = null;

    await user.save();

    return res.status(200).json({
      message:
        "Password reset successful. Please log in with your new password",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Server error while resetting password",
    });
  }
};
module.exports = {
  registerUser,
  verifyEmailOtp,
  resendEmailOtp,
  loginUser,
  forgotPassword,
  resetPassword,
};
