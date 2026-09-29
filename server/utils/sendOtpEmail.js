const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail({
  to,
  subject,
  heading,
  message,
  otp = null,
  expiresMinutes = 10,
}) {
  // Recipient email is always required.
  // OTP is optional for schedule and notification emails.
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const hasOtp =
    otp !== null &&
    otp !== undefined &&
    String(otp).trim() !== "";

  // Build email text based on whether an OTP is included.
  let emailText = `${heading}\n\n${message}`;

  if (hasOtp) {
    emailText += `\n\nYour OTP is: ${otp}\n\n`;
    emailText += `This code expires in ${expiresMinutes} minutes. `;
    emailText +=
      "Do not share this code except with the authorized person completing your order or return.";
  }

  const otpHtml = hasOtp
    ? `
        <div style="background:#f0fdf4;padding:18px;text-align:center;border-radius:8px;margin:20px 0;">
          <h1 style="letter-spacing:8px;color:#166534;margin:0;">
            ${otp}
          </h1>
        </div>

        <p style="color:#555;">
          This code expires in ${expiresMinutes} minutes.
        </p>

        <p style="color:#b91c1c;font-size:13px;">
          Do not share this code except with the authorized person
          completing your order or return.
        </p>
      `
    : "";

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,

    text: emailText,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #ddd;border-radius:12px;">

        <h2 style="color:#166534;">
          ${heading}
        </h2>

        <p style="font-size:16px;color:#333;line-height:1.6;">
          ${message}
        </p>

        ${otpHtml}

        <hr style="border:0;border-top:1px solid #ddd;margin:20px 0;" />

        <p style="font-size:12px;color:#777;">
          Smart Farmer Marketplace
        </p>

      </div>
    `,
  };

  const result = await transporter.sendMail(mailOptions);

  return result;
}

module.exports = sendOtpEmail;