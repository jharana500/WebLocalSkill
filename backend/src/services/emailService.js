const nodemailer = require("nodemailer");

let transporter = null;
let verifiedOnce = false;

function isConfigured() {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  if (!verifiedOnce) {
    verifiedOnce = true;
    transporter.verify().then(
      () => console.log("[email] SMTP connection verified"),
      (err) => console.error("[email] SMTP verification failed:", err.message),
    );
  }

  return transporter;
}

// Sends an email if SMTP is configured; otherwise logs a clear, safe warning
// (never secrets) and returns { sent: false } instead of throwing, so callers
// like forgot-password can still respond to the user without crashing or
// silently claiming success.
async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!isConfigured()) {
    console.warn("[email] SMTP configuration missing — email not sent");
    return { sent: false, reason: "not_configured" };
  }

  try {
    await getTransporter().sendMail({ from, to, subject, html, text });
    console.log(`[email] Email sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (error) {
    console.error(`[email] Email failed to send to ${to}:`, error.message);
    return { sent: false, reason: "send_failed" };
  }
}

async function sendPasswordResetEmail(email, resetUrl) {
  return sendMail({
    to: email,
    subject: "Reset your LocalSkill password",
    text: `We received a request to reset your password. Open this link within 30 minutes to choose a new one:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <p>We received a request to reset your LocalSkill password.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a> (expires in 30 minutes).</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

async function sendContactEmail({ name, email, subject, message }) {
  const to = process.env.CONTACT_INBOX_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  return sendMail({
    to,
    subject: `[Contact Form] ${subject} — from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p>${String(message).replace(/\n/g, "<br/>")}</p>
    `,
  });
}

module.exports = { isConfigured, sendMail, sendPasswordResetEmail, sendContactEmail };
