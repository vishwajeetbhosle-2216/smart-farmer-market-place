import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "buyer",
  });

  const [otp, setOtp] = useState("");
  const [verificationEmail, setVerificationEmail] =
    useState("");

  const [showOtpForm, setShowOtpForm] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] =
    useState(false);

  const [resendCooldown, setResendCooldown] =
    useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "mobile") {
      const digits = value.replace(/\D/g, "").slice(0, 10);

      setFormData((prev) => ({
        ...prev,
        mobile: digits,
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // STEP 1: REGISTER USER
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      setVerificationEmail(
        data.email || formData.email.trim().toLowerCase()
      );

      setShowOtpForm(true);
      setResendCooldown(60);

      setMessage(
        data.message ||
          "OTP sent to your email. Please verify your account."
      );
    } catch (error) {
      console.error("Registration error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY EMAIL OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/verify-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: verificationEmail,
            otp: otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "OTP verification failed."
        );
        return;
      }

      setMessage(
        "Email verified successfully! Redirecting to login..."
      );

      setOtp("");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: RESEND EMAIL OTP
  const handleResendOtp = async () => {
    setMessage("");
    setError("");

    if (resendCooldown > 0) return;

    try {
      setResendLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/resend-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: verificationEmail,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Unable to resend OTP."
        );

        if (response.status === 429) {
          setResendCooldown(60);
        }

        return;
      }

      setMessage(
        data.message ||
          "A new OTP has been sent to your email."
      );

      setOtp("");
      setResendCooldown(60);
    } catch (error) {
      console.error("Resend OTP error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToRegister = () => {
    setShowOtpForm(false);
    setOtp("");
    setMessage("");
    setError("");
    setResendCooldown(0);
  };

  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-header">
          <div className="register-icon">🌱</div>

          <h1>
            {showOtpForm
              ? "Verify Your Email"
              : "Create Account"}
          </h1>

          <p>
            {showOtpForm
              ? "Secure your Smart Farmer Marketplace account"
              : "Join Smart Farmer Marketplace"}
          </p>
        </div>

        {!showOtpForm && (
          <form
            className="register-form"
            onSubmit={handleSubmit}
          >
            <div className="register-form-group">
              <label>👤 Full Name</label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="register-form-group">
              <label>✉️ Email Address</label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            {/* MOBILE NUMBER */}

            <div className="register-form-group">
              <label>📱 Mobile Number (WhatsApp / SMS)</label>

              <div style={{
                display: "flex",
                gap: "8px",
                alignItems: "center"
              }}>
                <span style={{
                  padding: "12px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  background: "#f5f5f5",
                  color: "#222",
                  fontWeight: "600"
                }}>
                  +91
                </span>

                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit Indian mobile number"
                  required
                />
              </div>

              <small>
                Enter a number that can receive WhatsApp messages
                and SMS for order delivery and return OTPs.
              </small>
            </div>

            <div className="register-form-group">
              <label>🔒 Password</label>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                minLength={8}
                required
              />

              <small>
                Password must be at least 8 characters.
              </small>
            </div>

            <div className="register-form-group">
              <label>👨‍🌾 Register As</label>

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="buyer">🛒 Buyer</option>
                <option value="farmer">🌾 Farmer</option>
              </select>
            </div>

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create Account →"}
            </button>
          </form>
        )}

        {showOtpForm && (
          <form
            className="register-form"
            onSubmit={handleVerifyOtp}
          >
            <div className="register-form-group">
              <label>✉️ Verification Email</label>

              <input
                type="email"
                value={verificationEmail}
                readOnly
              />
            </div>

            <p>
              We have sent a 6-digit verification code
              to your email. Enter it below to activate
              your account.
            </p>

            <div className="register-form-group">
              <label>🔐 Enter Email OTP</label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);

                  setOtp(value);
                }}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="register-button"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Email →"}
            </button>

            <button
              type="button"
              className="register-button"
              onClick={handleResendOtp}
              disabled={
                resendLoading || resendCooldown > 0
              }
            >
              {resendLoading
                ? "Sending OTP..."
                : resendCooldown > 0
                ? `Resend OTP in ${resendCooldown}s`
                : "Resend OTP"}
            </button>

            <button
              type="button"
              onClick={handleBackToRegister}
            >
              ← Change email / Back
            </button>
          </form>
        )}

        {message && (
          <div className="register-success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="register-error-message">
            ⚠ {error}
          </div>
        )}

        <div className="register-footer">
          <span>
            {showOtpForm
              ? "Verify your email to activate your account."
              : "Create your account and start using Smart Farmer Marketplace."}
          </span>
        </div>

      </div>
    </div>
  );
}

export default Register;