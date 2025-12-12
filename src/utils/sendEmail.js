// src/utils/sendEmail.js

const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const pool = require('../config/db'); // Import DB connection

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = 'OriNotes Admin <helloworld760975@gmail.com>';

// Init SendGrid if API key provided
if (SENDGRID_API_KEY) {
  try {
    sgMail.setApiKey(SENDGRID_API_KEY);
  } catch (err) {
    console.warn('sendEmail: SendGrid init failed:', err?.message || err);
  }
}

/**
 * Helper to fetch email settings from DB
 */
async function getEmailSettings() {
  try {
    const res = await pool.query(
      "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'enable_system_emails')"
    );
    const settings = res.rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});
    return settings;
  } catch (err) {
    console.error("Failed to fetch email settings from DB", err);
    return {};
  }
}

/**
 * Generic send function. Priority:
 * 1. DB-configured SMTP (if enabled)
 * 2. Env-configured SendGrid
 * 3. Env-configured SMTP
 */
async function sendEmail({ to, subject, html, text }) {
  // 1. Fetch dynamic settings
  const dbSettings = await getEmailSettings();
  const systemEmailsEnabled = dbSettings.enable_system_emails === 'true'; // Check explicit 'true' string

  // If DB setup exists and is valid, try it first
  // Note: Only enforce enabled check if we want to BLOCK emails when disabled. 
  // For now, let's assume we proceed if settings exist, or we can check the toggle.
  // If 'enable_system_emails' is explicitly false, maybe we shouldn't send? 
  // Use case: Maintenance mode or just disabling spam.
  if (dbSettings.enable_system_emails === 'false') {
    console.log('System emails are disabled in Admin Settings.');
    return { provider: 'disabled' };
  }

  // 2. Try DB SMTP
  if (dbSettings.smtp_host) {
    try {
      const transporter = nodemailer.createTransport({
        host: dbSettings.smtp_host,
        port: Number(dbSettings.smtp_port || 587),
        secure: dbSettings.smtp_secure === 'true', // or port 465 logic
        auth: (dbSettings.smtp_user && dbSettings.smtp_pass) ? {
          user: dbSettings.smtp_user,
          pass: dbSettings.smtp_pass,
        } : undefined,
      });

      await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text,
      });
      return { provider: 'db-smtp' };
    } catch (err) {
      console.error('sendEmail: DB SMTP config failed. Falling back...', err.message);
      // Fall through to env vars
    }
  }

  // 3. Try SendGrid (Env)
  if (SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        to,
        from: EMAIL_FROM,
        subject,
        html,
        text,
      });
      return { provider: 'sendgrid' };
    } catch (err) {
      console.error('sendEmail: SendGrid error:', err?.response?.body || err.message || err);
    }
  }

  // 4. Try Nodemailer (Env fallback)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    // Reuse the static transport logic or recreate
    // (Simplified inline here for clarity)
    try {
      const envTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await envTransport.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text,
      });
      return { provider: 'env-smtp' };
    } catch (err) {
      console.error('sendEmail: Env SMTP error:', err);
      throw err;
    }
  }

  const msg = 'No email provider configured or all failed.';
  console.error('sendEmail:', msg);
  throw new Error(msg);
}

/**
 * Send password reset email (resetUrl should contain the token & email)
 * @param {string} to
 * @param {string} resetUrl
 */
async function sendResetPasswordEmail(to, resetUrl) {
  const subject = 'OriNotes — Password Reset Request';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
      <h2>OriNotes — Password Reset</h2>
      <p>We received a request to reset the password for <strong>${to}</strong>.</p>
      <p>Click the link below to reset your password. This link is valid for a short time.</p>
      <p style="margin: 18px 0; text-align:center;">
        <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="background:#06b6d4;color:white;padding:10px 14px;border-radius:6px;text-decoration:none;">Reset your password</a>
      </p>
      <p>If the button doesn't work, copy & paste this URL into your browser:</p>
      <p style="font-size:0.9em;color:#666;">${resetUrl}</p>
      <hr />
      <p style="font-size:0.85em;color:#666;">If you did not request this, ignore this email.</p>
    </div>
  `;
  const text = `Reset your OriNotes password: ${resetUrl}`;

  // If no provider configured, log the link for dev
  try {
    const res = await sendEmail({ to, subject, html, text });
    return res;
  } catch (err) {
    console.warn('sendResetPasswordEmail: failed to send email, logging reset link for debug:', resetUrl);
    console.log(`\n==================================================`);
    console.log(`[DEV FALLBACK] Reset Link for ${to}:`);
    console.log(`${resetUrl}`);
    console.log(`==================================================\n`);
    // We do NOT rethrow here, so the frontend shows "Email sent"
    return { provider: 'console-fallback' };
  }
}

// Alias for compatibility (some controllers expect sendPasswordReset)
const sendPasswordReset = sendResetPasswordEmail;

/**
 * Send an email OTP (6-digit) — used for login/verification flows.
 * @param {string} to
 * @param {string} otp
 */
async function sendEmailOtp(to, otp) {
  const subject = 'OriNotes — Verification Code';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif;">
      <h3>OriNotes Verification Code</h3>
      <p>Use the following code to complete your action. It expires in 10 minutes.</p>
      <p style="font-size:1.6rem;font-weight:700;margin:10px 0;">${otp}</p>
      <p>If you did not request this, ignore this email.</p>
    </div>
  `;
  const text = `Your OriNotes verification code: ${otp}`;

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (err) {
    console.error('sendEmailOtp: failed to send OTP email', err);
    // FALLBACK FOR DEV/TESTING: Log OTP to console so user can still proceed
    console.log(`\n==================================================`);
    console.log(`[DEV FALLBACK] OTP for ${to}: ${otp}`);
    console.log(`==================================================\n`);
    // We do NOT rethrow here, so the frontend thinks it succeeded and asks for the OTP
    return { provider: 'console-fallback' };
  }
}

/**
 * Optional helper: notify user about successful login / new device (useful for "remember me")
 * meta can contain ip, device, time
 */
async function sendLoginNotification(to, meta = {}) {
  const subject = 'OriNotes — New sign-in to your account';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif;">
      <h3>New sign-in detected</h3>
      <p>We detected a new sign-in for your OriNotes account (${to}).</p>
      <p><strong>Details:</strong></p>
      <ul>
        ${meta.ip ? `<li>IP: ${meta.ip}</li>` : ''}
        ${meta.agent ? `<li>Device: ${meta.agent}</li>` : ''}
        <li>Time: ${new Date().toLocaleString()}</li>
      </ul>
      <p>If this was you, no action is needed. If you didn't sign in, please reset your password immediately.</p>
    </div>
  `;
  const text = `New sign-in detected for ${to}. Time: ${new Date().toLocaleString()}`;

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (err) {
    console.error('sendLoginNotification: failed to send login notification', err);
    // Not critical, so swallow error and return failure indicator
    return { success: false, error: err.message || String(err) };
  }
}

async function sendMaintenanceOverEmail(to) {
  const subject = 'OriNotes — Maintenance Completed';
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif;">
      <h3>We are back online!</h3>
      <p>The scheduled maintenance for OriNotes has been completed.</p>
      <p>You can now access the platform and continue your work.</p>
      <p style="margin: 18px 0;">
        <a href="http://localhost:5173" target="_blank" style="background:#22c55e;color:white;padding:10px 14px;border-radius:6px;text-decoration:none;">Go to OriNotes</a>
      </p>
      <p>Thank you for your patience.</p>
    </div>
  `;
  const text = `OriNotes maintenance is complete. You can now access the platform.`;

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (err) {
    console.error(`sendMaintenanceOverEmail: failed to send to ${to}`, err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendEmail,
  sendResetPasswordEmail,
  sendPasswordReset, // alias
  sendEmailOtp,
  sendLoginNotification,
  sendMaintenanceOverEmail,
};