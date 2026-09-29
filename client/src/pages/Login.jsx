import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] =
    useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("Logging in...");
    setMessageType("");

    try {
      const response = await fetch(
        "https://smart-farmer-api-g7q.onrender.com/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed.");
        setMessageType("error");
        return;
      }

      // Save authentication information
      localStorage.setItem("token", data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      // Notify Navbar that login happened
      window.dispatchEvent(
        new Event("authChanged")
      );

      setMessage("Login successful!");
      setMessageType("success");

      // Redirect according to role
      if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user.role === "farmer") {
        navigate("/farmer/dashboard");
      } else {
        navigate("/buyer/nearby-products");
      }
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Unable to connect to the server."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // OPEN FORGOT PASSWORD
  const openForgotPassword = () => {
    setShowForgotPassword(true);
    setOtpSent(false);
    setResetOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("");
  };

  // SEND RESET OTP
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setMessage("Please enter your registered email.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "https://smart-farmer-api-g7q.onrender.com/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not send reset OTP."
        );
        setMessageType("error");
        return;
      }

      setOtpSent(true);

      setMessage(
        data.message ||
          "If a verified account exists, a reset OTP will be sent."
      );

      setMessageType("success");
    } catch (error) {
      console.error("Forgot password error:", error);

      setMessage(
        "Unable to connect to the server."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(resetOtp.trim())) {
      setMessage("Please enter a valid 6-digit OTP.");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 8) {
      setMessage(
        "New password must be at least 8 characters long."
      );
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "https://smart-farmer-api-g7q.onrender.com/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            otp: resetOtp.trim(),
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Password reset failed."
        );
        setMessageType("error");
        return;
      }

      setMessage(
        "Password reset successful! Please log in with your new password."
      );

      setMessageType("success");

      // Return to login after successful reset
      setPassword("");
      setResetOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setOtpSent(false);
      setShowForgotPassword(false);
    } catch (error) {
      console.error("Reset password error:", error);

      setMessage(
        "Unable to connect to the server."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // BACK TO LOGIN
  const backToLogin = () => {
    setShowForgotPassword(false);
    setOtpSent(false);
    setResetOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setMessageType("");
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* HEADER */}
        <div className="login-header">
          <div className="login-icon">
            🌱
          </div>

          <h1>
            {showForgotPassword
              ? "Reset Password"
              : "Welcome Back"}
          </h1>

          <p>
            {showForgotPassword
              ? "Recover your Smart Farmer Marketplace account"
              : "Login to Smart Farmer Marketplace"}
          </p>
        </div>

        {/* NORMAL LOGIN */}
        {!showForgotPassword && (
          <>
            <form
              className="login-form"
              onSubmit={handleLogin}
            >
              <div className="login-form-group">
                <label>
                  📧 Email Address
                </label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />
              </div>

              <div className="login-form-group">
                <label>
                  🔒 Password
                </label>

                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />
              </div>

              {/* FORGOT PASSWORD LINK */}
              <div className="forgot-password-row">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={openForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                className="login-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : "Login →"}
              </button>
            </form>
          </>
        )}

        {/* FORGOT PASSWORD: EMAIL */}
        {showForgotPassword && !otpSent && (
          <form
            className="login-form"
            onSubmit={handleForgotPassword}
          >
            <div className="reset-info">
              Enter your registered email address.
              We'll send you a 6-digit OTP to reset
              your password.
            </div>

            <div className="login-form-group">
              <label>
                📧 Registered Email
              </label>

              <input
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </div>

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending OTP..."
                : "Send Reset OTP →"}
            </button>
          </form>
        )}

        {/* RESET PASSWORD: OTP + NEW PASSWORD */}
        {showForgotPassword && otpSent && (
          <form
            className="login-form"
            onSubmit={handleResetPassword}
          >
            <div className="reset-info">
              Enter the 6-digit OTP sent to your
              registered email and choose a new
              password.
            </div>

            <div className="login-form-group">
              <label>
                🔐 Email OTP
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit OTP"
                value={resetOtp}
                onChange={(e) =>
                  setResetOtp(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                required
              />
            </div>

            <div className="login-form-group">
              <label>
                🔒 New Password
              </label>

              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                minLength={8}
                required
              />
            </div>

            <div className="login-form-group">
              <label>
                🔒 Confirm New Password
              </label>

              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                minLength={8}
                required
              />
            </div>

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Resetting Password..."
                : "Reset Password →"}
            </button>

            <button
              type="button"
              className="resend-reset-button"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* MESSAGE */}
        {message && (
          <div
            className={
              messageType === "success"
                ? "login-success-message"
                : "login-message"
            }
          >
            {message}
          </div>
        )}

        {/* FOOTER */}
        <div className="login-footer">
          {showForgotPassword ? (
            <button
              type="button"
              className="back-to-login"
              onClick={backToLogin}
            >
              ← Back to Login
            </button>
          ) : (
            <span>
              Secure access to your marketplace account
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

export default Login;