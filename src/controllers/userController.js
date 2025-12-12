// src/controllers/userController.js
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserByEmailOrUsername,
  verifyUser,
  findUserById,
  updateUserPassword,
  updateUserProfile,
  updateUserLastLogin,
  findUserByVerificationToken,
  updateTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor
} = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const {
  sendEmailOtp,
  sendResetPasswordEmail,
  sendLoginNotification
} = require("../utils/sendEmail");
const { sendSmsOtp, sendResetSms } = require("../utils/sendSms");

// Configuration constants (adjust via env vars)
const RESET_TOKEN_EXPIRY_MINUTES = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES || "60", 10); // 60 min
const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || "10", 10); // 10 days
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

// --- helper payload for frontend (unchanged) ---
const createUserPayload = (user, isSubscriptionEnabled) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    subscription_expiry: user.subscription_expiry,
    free_views: user.free_views,
    free_views: user.free_views,
    created_at: user.created_at, // Added for 'Joined Date'
    skills: user.skills, // Ensure skills are passed
    is_subscription_enabled: isSubscriptionEnabled,
    // Profile Fields
    bio: user.bio,
    school_college: user.school_college,
    branch: user.branch,
    semester: user.semester,
    gender: user.gender,
    social_links: user.social_links
  };
};

// ----------------------
// PENDING REGISTRATION (Phase 8)
// ----------------------
async function registerUser(req, res) {
  try {
    const { name, email, password, mobileNumber, username } = req.body;

    if (!name || !email || !password || !mobileNumber || !username) {
      return res.status(400).json({
        error: "All required fields are needed: name, email, password, mobileNumber, username",
      });
    }

    // Prevent duplicate in final users
    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: "User already exists with this email" });
    }
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: "This username is already taken" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const role = email === process.env.ADMIN_EMAIL ? "admin" : "user";

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();

    // Upsert into pending_registrations table (create if missing)
    await pool.query(
      `INSERT INTO pending_registrations (name, email, password, username, mobile_number, role, otp, otp_created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         username = EXCLUDED.username,
         mobile_number = EXCLUDED.mobile_number,
         role = EXCLUDED.role,
         otp = EXCLUDED.otp,
         otp_created_at = EXCLUDED.otp_created_at`,
      [name, email.toLowerCase().trim(), hashedPassword, username, mobileNumber, role, otp, now]
    );

    // Send OTP via email (and optionally SMS)
    await sendEmailOtp(email, otp).catch(e => console.warn("sendEmailOtp error:", e));
    // Optionally: sendSmsOtp(mobileNumber, otp) if phone verification desired

    return res.status(201).json({
      message: "Registration pending. OTP sent to your email. Please verify to complete signup.",
    });
  } catch (err) {
    console.error("Registration error (pending flow):", err);
    return res.status(500).json({ error: "Registration failed", details: err.message });
  }
}

// ----------------------
// LOGIN / 2FA / REMEMBER-ME (Phase 7)
// ----------------------
async function loginUser(req, res) {
  try {
    const { identifier, password, twoFactorCode, rememberMe } = req.body; // rememberMe boolean
    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifier and password are required" });
    }

    const user = await findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // CHECK MAINTENANCE MODE
    const maintenanceResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'"
    );
    const maintenanceMode = maintenanceResult.rows[0]?.setting_value === 'true';

    if (maintenanceMode && user.role !== 'admin') {
      return res.status(503).json({ error: "Site is under maintenance. Please try again later." });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email to log in." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2FA check
    if (user.is_two_factor_enabled) {
      if (!twoFactorCode) {
        return res.status(403).json({ error: "2FA required", twoFactorRequired: true });
      }
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: "base32",
        token: twoFactorCode,
      });
      if (!verified) {
        return res.status(403).json({ error: "Invalid 2FA code", twoFactorRequired: true });
      }
    }

    // Update last login
    await updateUserLastLogin(user.id);

    // Prepare response
    const settingsResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'is_subscription_enabled'"
    );
    const isSubscriptionEnabled = settingsResult.rows[0]?.setting_value ?? false;
    const freshUser = await findUserById(user.id);

    // Generate access token (short-lived)
    // Generate access token (short-lived)
    const accessToken = generateToken(freshUser);

    // Create refresh token for EVERY login (so session persists while browser is open)
    const { rawToken } = await _createRefreshTokenForUser(user.id, req);

    // Cookie options:
    // - If rememberMe: persistent cookie (maxAge set)
    // - If !rememberMe: session cookie (no maxAge, clears on browser close)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    };

    if (rememberMe) {
      cookieOptions.maxAge = REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
    }

    res.cookie("refreshToken", rawToken, cookieOptions);

    // Optionally send login notification
    if (rememberMe) {
      sendLoginNotification(user.email, { ip: req.ip, agent: req.get("User-Agent") }).catch(() => { });
    }

    return res.json({
      message: "Login successful",
      user: createUserPayload(freshUser, isSubscriptionEnabled),
      token: accessToken,
      remember: !!rememberMe,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
}

// Helper: create & store refresh token (returns raw and hashed)
async function _createRefreshTokenForUser(userId, req) {
  const rawToken = crypto.randomBytes(64).toString("hex"); // long random token
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashedToken, expiresAt.toISOString(), req.get("User-Agent") || null, req.ip || null]
  );

  return { rawToken, hashedToken, expiresAt };
}

// ----------------------
// REFRESH AUTH TOKEN endpoint (Phase 7)
// ----------------------
async function refreshAuthToken(req, res) {
  try {
    // Try cookie first, then body
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    const rtResult = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked, u.*
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token = $1 LIMIT 1`,
      [hashed]
    );

    if (rtResult.rowCount === 0) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    const row = rtResult.rows[0];
    if (row.revoked) return res.status(401).json({ error: "Refresh token revoked" });
    if (new Date(row.expires_at) < new Date()) return res.status(401).json({ error: "Refresh token expired" });

    // Issue new short-lived access token
    const user = await findUserById(row.user_id);
    if (!user) return res.status(401).json({ error: "User not found" });

    const newAccessToken = generateToken(user);

    // (Optional) rotate refresh token: for simplicity we keep same refresh token
    res.json({ token: newAccessToken });
  } catch (err) {
    console.error("refreshAuthToken error:", err);
    res.status(500).json({ error: "Failed to refresh token" });
  }
}

// Logout / revoke refresh token (Phase 7)
async function logout(req, res) {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) {
      // Clear cookie anyway
      res.clearCookie("refreshToken");
      return res.json({ message: "Logged out" });
    }
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
    await pool.query("UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1", [hashed]);
    res.clearCookie("refreshToken");
    return res.json({ message: "Logged out and refresh token revoked" });
  } catch (err) {
    console.error("Logout error:", err);
    res.clearCookie("refreshToken");
    res.status(500).json({ error: "Logout failed" });
  }
}

// ----------------------
// 2FA helpers (existing) - ensure speakeasy & qrcode imported
// ----------------------
async function generateTwoFactorSecret(req, res) {
  try {
    const userId = req.user.id;
    const secret = speakeasy.generateSecret({
      name: `OriNotes:${req.user.username}`,
    });
    await updateTwoFactorSecret(userId, secret.base32);
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qrCodeUrl });
  } catch (err) {
    console.error("❌ Error generating 2FA secret:", err.message);
    res.status(500).json({ error: "Failed to generate 2FA secret." });
  }
}

async function verifyTwoFactorSetup(req, res) {
  try {
    const { token, secret } = req.body;
    const userId = req.user.id;
    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
    });
    if (verified) {
      await enableTwoFactor(userId);
      const user = await findUserById(userId);
      const settingsResult = await pool.query(
        "SELECT setting_value FROM app_settings WHERE setting_key = 'is_subscription_enabled'"
      );
      const isSubscriptionEnabled = settingsResult.rows[0]?.setting_value ?? false;
      return res.json({
        message: "✅ 2FA successfully enabled.",
        user: createUserPayload(user, isSubscriptionEnabled),
        token: generateToken(user),
      });
    } else {
      await updateTwoFactorSecret(userId, null, false);
      res.status(400).json({ error: "❌ Invalid verification code. 2FA setup failed." });
    }
  } catch (err) {
    console.error("❌ Error verifying 2FA setup:", err.message);
    res.status(500).json({ error: "Failed to verify 2FA setup." });
  }
}

async function disableTwoFactorAuth(req, res) {
  try {
    await disableTwoFactor(req.user.id);
    const user = await findUserById(req.user.id);
    const settingsResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'is_subscription_enabled'"
    );
    const isSubscriptionEnabled = settingsResult.rows[0]?.setting_value ?? false;
    res.json({
      message: "✅ 2FA successfully disabled.",
      user: createUserPayload(user, isSubscriptionEnabled),
      token: generateToken(user),
    });
  } catch (err) {
    console.error("❌ Error disabling 2FA:", err.message);
    res.status(500).json({ error: "Failed to disable 2FA." });
  }
}

// ----------------------
// OTP Login flow (existing)
// ----------------------
async function requestLoginOtp(req, res) {
  try {
    const { identifier } = req.body;
    const user = await findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: "Your account is not verified." });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      `INSERT INTO otps (email, otp) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET otp = $2, created_at = NOW()`,
      [user.email, otp]
    );
    await sendEmailOtp(user.email, otp).catch(e => console.warn("sendEmailOtp error:", e));
    // Optionally: sendSmsOtp(user.mobile_number, otp) if phone present
    res.status(200).json({ message: `An OTP has been sent to the email associated with your account.` });
  } catch (err) {
    console.error("Request Login OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP." });
  }
}

async function verifyLoginOtp(req, res) {
  try {
    const { identifier, otp } = req.body;
    const user = await findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const otpResult = await pool.query(
      "SELECT * FROM otps WHERE email = $1 AND otp = $2 AND created_at > NOW() - INTERVAL '5 minutes'",
      [user.email, otp]
    );
    if (otpResult.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }
    await pool.query("DELETE FROM otps WHERE email = $1", [user.email]);
    await updateUserLastLogin(user.id);
    const settingsResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'is_subscription_enabled'"
    );
    const isSubscriptionEnabled = settingsResult.rows[0]?.setting_value ?? false;
    res.json({
      message: "Login successful",
      user: createUserPayload(user, isSubscriptionEnabled),
      token: generateToken(user),
    });
  } catch (err) {
    console.error("Verify Login OTP error:", err);
    res.status(500).json({ error: "Login failed." });
  }
}

// ----------------------
// EMAIL VERIFICATION (Phase 8 finalization) - existing
// ----------------------
async function verifyEmailOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const pendingResult = await pool.query(
      `SELECT * FROM pending_registrations WHERE email = $1 AND otp = $2 AND otp_created_at > NOW() - INTERVAL '10 minutes'`,
      [email.toLowerCase().trim(), otp]
    );
    if (pendingResult.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
    }
    const pending = pendingResult.rows[0];
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      await pool.query("DELETE FROM pending_registrations WHERE email = $1", [email.toLowerCase().trim()]);
      return res.status(200).json({ message: "Account already exists. Please log in." });
    }

    // Create the final user from pending (password already hashed)
    const newUser = await createUser(
      pending.name,
      pending.email,
      pending.password,
      pending.role || "user",
      null,
      pending.mobile_number,
      pending.username
    );
    if (!newUser || !newUser.id) {
      console.error("Failed to create user from pending registration:", pending);
      return res.status(500).json({ error: "Failed to create user account." });
    }

    // Mark verified, delete pending, clear OTPS
    await verifyUser(newUser.id);
    await pool.query("DELETE FROM pending_registrations WHERE email = $1", [email.toLowerCase().trim()]);
    await pool.query("DELETE FROM otps WHERE email = $1", [email.toLowerCase().trim()]).catch(() => { });

    await updateUserLastLogin(newUser.id);
    const settingsResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'is_subscription_enabled'"
    );
    const isSubscriptionEnabled = settingsResult.rows[0]?.setting_value ?? false;
    const freshUser = await findUserById(newUser.id);
    return res.json({
      message: "Email verified successfully! Logging you in...",
      user: createUserPayload(freshUser, isSubscriptionEnabled),
      token: generateToken(freshUser),
    });
  } catch (err) {
    console.error("Verify Email OTP error (pending flow):", err);
    return res.status(500).json({ error: "Verification failed." });
  }
}

// ----------------------
// CHANGE PASSWORD (existing)
// ----------------------
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Old and new passwords are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect old password." });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await updateUserPassword(userId, hashedNewPassword);
    res.json({ message: "✅ Password changed successfully!" });
  } catch (err) {
    console.error("Change Password error:", err);
    res.status(500).json({ error: "Failed to change password." });
  }
}

// ----------------------
// FORGOT / RESET PASSWORD (Phase 1 Fix: Removed silent catch)
// ----------------------
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const userResult = await pool.query("SELECT id, email FROM users WHERE email=$1", [email.toLowerCase().trim()]);
    if (!userResult.rowCount) {
      // Generic response to prevent user enumeration
      return res.json({ message: "If an account with this email exists, a reset link has been sent." });
    }

    const user = userResult.rows[0];

    // Create raw token and store hashed value in DB
    const rawToken = crypto.randomBytes(32).toString("hex"); // 64 chars
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`,
      [hashedToken, expiresAt.toISOString(), user.id]
    );

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // PHASE 1 FIX: Removed the silent .catch(e => console.warn(...)) to allow a proper error response if email fails.
    // If sendEmail is properly configured to throw, the outer catch block will handle it.
    await sendResetPasswordEmail(user.email, resetUrl);
    // Optionally send SMS short message
    // await sendResetSms(user.mobile_number, resetUrl).catch(e => console.warn("sendResetSms error:", e));

    return res.json({ message: "If an account with this email exists, a reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword error:", err);
    // If the error is specific to email sending (e.g., SendGrid offline), you can refine this.
    // For now, catch all and provide a generic server error.
    return res.status(500).json({ error: "Failed to process password reset request. Please check server logs." });
  }
}

async function resetPassword(req, res) {
  const { token, password, email } = req.body;
  if (!token || !password || !email) return res.status(400).json({ error: "Token, email and password are required" });

  try {
    // Hash incoming token and match against DB
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const result = await pool.query(
      `SELECT id, reset_token_expires, email FROM users WHERE reset_token = $1 AND email = $2 LIMIT 1`,
      [tokenHash, email.toLowerCase().trim()]
    );
    if (!result.rowCount) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    const user = result.rows[0];
    const expiresAt = new Date(user.reset_token_expires);
    if (!expiresAt || expiresAt < new Date()) {
      return res.status(400).json({ error: "Token has expired" });
    }

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hashed = await bcrypt.hash(password, salt);

    await pool.query(
      `UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
      [hashed, user.id]
    );

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

// ----------------------
// VERIFY EMAIL (legacy route)
async function verifyEmail(req, res) {
  try {
    const { token } = req.params;
    const user = await findUserByVerificationToken(token);
    if (!user) {
      return res.status(400).send("<h1>Verification link is invalid or has expired.</h1>");
    }
    await verifyUser(user.id);
    res.send("<h1>✅ Email Verified Successfully!</h1><p>You can now close this tab and log in.</p>");
  } catch (err) {
    console.error("Verify Email Link error:", err);
    res.status(500).send("<h1>Error</h1><p>An error occurred during verification.</p>");
  }
}

// ----------------------
// PROFILE / STATS / DASHBOARD (unchanged from you)
// ----------------------
async function getPublicProfile(req, res) {
  try {
    const { username } = req.params;
    const userResult = await pool.query("SELECT id, username, badges FROM users WHERE username = $1", [username]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const user = userResult.rows[0];
    const notesResult = await pool.query(
      "SELECT id, title, view_count FROM notes WHERE user_id = $1 AND approval_status = 'approved'",
      [user.id]
    );
    res.json({ username: user.username, badges: user.badges || [], uploadedNotes: notesResult.rows });
  } catch (err) {
    console.error("Get Public Profile error:", err);
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
}

async function getUserStats(req, res) {
  try {
    const userId = req.user.id;

    // 1. Overview Counts
    const [uploadsResult, viewsResult, favouritesResult, allUploadsCount, readsResult] = await Promise.all([
      pool.query("SELECT approval_status, COUNT(*) as count FROM notes WHERE user_id = $1 GROUP BY approval_status", [userId]),
      pool.query("SELECT COALESCE(SUM(view_count), 0) as total_views FROM notes WHERE user_id = $1 AND approval_status = 'approved'", [userId]),
      pool.query("SELECT COUNT(*) FROM user_favourites WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) FROM notes WHERE user_id = $1", [userId]),
      // Reads: Distinct notes viewed by this user
      pool.query("SELECT COUNT(DISTINCT note_id) as count FROM user_views WHERE user_id = $1", [userId])
    ]);

    const overview = { approved: 0, pending: 0, rejected: 0, total_views: parseInt(viewsResult.rows[0].total_views) || 0 };
    uploadsResult.rows.forEach(row => {
      if (overview.hasOwnProperty(row.approval_status)) {
        overview[row.approval_status] = parseInt(row.count);
      }
    });

    // 2. Top Performing Notes (Top 5 by views) - USER SPECIFIC
    const topNotesResult = await pool.query(`
      SELECT id, title, view_count, approval_status, created_at, subject, university_name
      FROM notes 
      WHERE user_id = $1 AND approval_status = 'approved'
      ORDER BY view_count DESC 
      LIMIT 4
    `, [userId]);

    // 2.5 Recommended Notes (Global Top 3)
    const globalTopNotesResult = await pool.query(`
      SELECT n.id, n.title, n.view_count, n.subject, n.university_name, u.username as author_name
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.approval_status = 'approved'
      ORDER BY n.view_count DESC
      LIMIT 3
    `);

    // 3. Activity / Contribution Data (Notes uploaded per day in last 30 days)
    const activityResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count 
      FROM notes 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [userId]);

    // 4. Calculate Streak
    // Fetch all unique creation dates for this user's uploads
    const datesResult = await pool.query(`
        SELECT DISTINCT DATE(created_at) as date
        FROM notes
        WHERE user_id = $1
        ORDER BY date DESC
    `, [userId]);

    let streak = 0;
    if (datesResult.rows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const uploadDates = datesResult.rows.map(r => new Date(r.date));

      // check if last upload was today or yesterday to start the streak
      const lastUpload = uploadDates[0];
      lastUpload.setHours(0, 0, 0, 0);

      if (lastUpload.getTime() === today.getTime() || lastUpload.getTime() === yesterday.getTime()) {
        streak = 1;
        let currentDate = lastUpload;

        for (let i = 1; i < uploadDates.length; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1); // Expected previous day

          const thisDate = uploadDates[i];
          thisDate.setHours(0, 0, 0, 0);

          if (thisDate.getTime() === prevDate.getTime()) {
            streak++;
            currentDate = thisDate;
          } else {
            break;
          }
        }
      }
    }

    // 5. Highlights: Best Month & Most Viewed
    const bestMonthResult = await pool.query(`
        SELECT TO_CHAR(created_at, 'Month YYYY') as month, COUNT(*) as count 
        FROM notes 
        WHERE user_id = $1 
        GROUP BY month 
        ORDER BY count DESC 
        LIMIT 1
    `, [userId]);

    const bestMonth = bestMonthResult.rows[0] || { month: 'No uploads yet', count: 0 };
    const mostViewed = topNotesResult.rows[0] || { title: 'No approved notes', view_count: 0 };

    res.json({
      overview,
      topNotes: topNotesResult.rows,
      recommendedNotes: globalTopNotesResult.rows,
      activity: activityResult.rows,
      realStats: {
        totalUploads: parseInt(allUploadsCount.rows[0].count) || 0,
        favouritesCount: parseInt(favouritesResult.rows[0].count) || 0,
        totalViewsReceived: parseInt(viewsResult.rows[0].total_views) || 0,
        readsCount: parseInt(readsResult.rows[0].count) || 0,
        streak: streak
      },
      highlightStats: {
        bestMonth: bestMonth.month.trim(),
        bestMonthCount: parseInt(bestMonth.count),
        mostViewedNoteTitle: mostViewed.title,
        mostViewedNoteViews: parseInt(mostViewed.view_count)
      }
    });

  } catch (err) {
    console.error("Get User Stats error:", err);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
}

async function getDashboardData(req, res) {
  try {
    const userId = req.user.id;
    const [userResult, notesViewedResult, totalNotesCountResult] = await Promise.all([
      pool.query("SELECT name, subscription_expiry, free_views, badges FROM users WHERE id = $1", [userId]),
      pool.query("SELECT COUNT(DISTINCT note_id) FROM user_views WHERE user_id = $1", [userId]),
      pool.query("SELECT COUNT(*) FROM notes WHERE approval_status = 'approved'")
    ]);
    const user = userResult.rows[0] || {};
    const notesViewed = parseInt(notesViewedResult.rows[0].count, 10) || 0;
    const totalNotes = parseInt(totalNotesCountResult.rows[0].count, 10) || 0;
    const dashboardData = {
      name: user.name,
      notesViewed,
      totalNotesAvailable: totalNotes,
      subscriptionExpiry: user.subscription_expiry,
      free_views: user.free_views,
      studyStreak: 5,
      badges: user.badges || [],
      leaderboardRank: 10,
    };
    res.json(dashboardData);
  } catch (err) {
    console.error("❌ Error fetching user dashboard data:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
}

async function getProfile(req, res) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    const settingsResult = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'is_subscription_enabled'"
    );
    const rawValue = settingsResult.rows[0]?.setting_value;
    const isSubscriptionEnabled = rawValue === 'true' || rawValue === true;

    console.log(`DEBUG: getProfile - user: ${user.email}, rawSetting: ${rawValue} (${typeof rawValue}), isEnabled: ${isSubscriptionEnabled} `);

    // Return the enriched payload just like login
    res.json(createUserPayload(user, isSubscriptionEnabled));
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Failed to get profile" });
  }
}
// NEW: FORGOT PASSWORD (OTP FLOW)
// ----------------------------------------------------------------

// Step 1: Send OTP to email
async function sendForgotPasswordOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // 1. Check if user exists
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rowCount === 0) {
      // Return 404 so frontend knows to show "User not found"
      return res.status(404).json({ error: "User not found with this email." });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Save OTP to DB (Insert or Update existing)
    await pool.query(
      `INSERT INTO otps(email, otp, created_at) VALUES($1, $2, NOW())
       ON CONFLICT(email) DO UPDATE SET otp = $2, created_at = NOW()`,
      [email, otp]
    );

    // 4. Send Email
    await sendEmailOtp(email, otp);

    res.json({ message: "OTP sent to your email successfully." });
  } catch (err) {
    console.error("Forgot Password OTP error:", err);
    res.status(500).json({ error: "Failed to send OTP." });
  }
}

// Step 2: Verify OTP (Used when user clicks "Verify" before entering new password)
async function verifyForgotPasswordOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  try {
    const result = await pool.query(
      "SELECT * FROM otps WHERE email = $1 AND otp = $2 AND created_at > NOW() - INTERVAL '10 minutes'",
      [email, otp]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    res.json({ message: "OTP verified. You can now set a new password." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Verification failed." });
  }
}

// Step 3: Reset Password (Final step)
async function resetPasswordWithOtp(req, res) {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "Email, OTP, and New Password are required." });
  }

  try {
    // 1. Verify OTP again (Secure check)
    const otpResult = await pool.query(
      "SELECT * FROM otps WHERE email = $1 AND otp = $2 AND created_at > NOW() - INTERVAL '10 minutes'",
      [email, otp]
    );

    if (otpResult.rowCount === 0) {
      return res.status(400).json({ error: "Invalid or expired OTP." });
    }

    // 2. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update User Password
    await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, email]);

    // 4. Delete used OTP
    await pool.query("DELETE FROM otps WHERE email = $1", [email]);

    res.json({ message: "Password changed successfully! You can now login." });

  } catch (err) {
    console.error("Reset Password error:", err);
    res.status(500).json({ error: "Failed to reset password." });
  }
}

// ----------------------
// ACTIVE SESSIONS (NEW)
// ----------------------
async function getActiveSessions(req, res) {
  try {
    const userId = req.user.id;
    // Get all valid refresh tokens
    const result = await pool.query(
      `SELECT id, ip_address, user_agent, created_at, expires_at 
       FROM refresh_tokens 
       WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW() 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Ideally we want to mark which one is CURRENT. 
    // The middleware doesn't strictly pass the current Refresh Token ID, 
    // but we can try to match by strictly comparing the refresh token if we had it, 
    // or just rely on the latest one being likely current or matching IP/UA.
    // GUIDANCE: A simple heuristic is matching the current request's signature if possible, 
    // but for now just returning the list is sufficient.

    // We can try to guess "current" by matching the cookie's refresh token if present
    const currentRefreshToken = req.cookies?.refreshToken;
    let currentSessionId = null;

    if (currentRefreshToken) {
      const hashed = crypto.createHash("sha256").update(currentRefreshToken).digest("hex");
      // We can't query token value directly because we didn't select it (security), 
      // but we can verify against the ID if we selected token too.
      // Let's secure-select token just to compare, then remove it.
      const secureResult = await pool.query(
        `SELECT id, token FROM refresh_tokens WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()`,
        [userId]
      );
      const match = secureResult.rows.find(row => row.token === hashed);
      if (match) currentSessionId = match.id;
    }

    const sessions = result.rows.map(row => ({
      id: row.id,
      ip: row.ip_address,
      device: row.user_agent, // Frontend will parse this
      isCurrent: row.id === currentSessionId,
      createdAt: row.created_at,
    }));

    res.json(sessions);
  } catch (err) {
    console.error("Get Active Sessions error:", err);
    res.status(500).json({ error: "Failed to fetch active sessions." });
  }
}

async function revokeAllSessions(req, res) {
  try {
    const userId = req.user.id;
    // Revoke all tokens for this user
    await pool.query(
      "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1",
      [userId]
    );
    // Clear cookie for current user too effectively logging them out
    res.clearCookie("refreshToken");
    res.json({ message: "All sessions revoked. You have been logged out." });
  } catch (err) {
    console.error("Revoke All Sessions error:", err);
    res.status(500).json({ error: "Failed to revoke sessions." });
  }
}

async function getPublicProfileById(req, res) {
  try {
    const { id } = req.params;

    // Validate ID (assuming integer IDs for now, or UUID)
    // If it's literally the string "undefined" or null
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: "Invalid User ID provided." });
    }

    // Fetch Badge & Username
    const userResult = await pool.query("SELECT id, username, badges, name FROM users WHERE id = $1", [id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const user = userResult.rows[0];

    // Fetch Approved Notes
    const notesResult = await pool.query(`
SELECT
id, title, subject, view_count, approval_status,
  created_at, university_name, course, material_type,
  user_id
      FROM notes 
      WHERE user_id = $1 AND approval_status = 'approved'
      ORDER BY created_at DESC
  `, [user.id]);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        badges: user.badges || []
      },
      notes: notesResult.rows
    });
  } catch (err) {
    console.error("Get Public Profile By ID error:", err.message);
    // Handle specific DB errors regarding type syntax
    if (err.code === '22P02') { // invalid text representation for integer
      return res.status(400).json({ error: "Invalid User ID format." });
    }
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
}


async function updateMyProfile(req, res) {
  try {
    const user = await updateUserProfile(req.user.id, req.body);
    res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
}

// ----------------------
async function searchUsers(req, res) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = `%${q.trim()}%`;
    const result = await pool.query(
      `SELECT id, name, username 
       FROM users 
       WHERE (name ILIKE $1 OR username ILIKE $1) 
       AND is_verified = true
       LIMIT 10`,
      [searchTerm]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Search Users error:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
}

// EXPORTS (include new functions)
async function submitContactForm(req, res) {
  try {
    const { name, email, message } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    await pool.query(
      `INSERT INTO contact_messages (user_id, name, email, message) VALUES ($1, $2, $3, $4)`,
      [userId, name, email, message]
    );

    res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact Form Error:", err);
    res.status(500).json({ error: "Failed to submit message" });
  }
}

// EXPORTS (include new functions)
module.exports = {
  registerUser,
  loginUser,
  requestLoginOtp,
  verifyLoginOtp,
  verifyEmailOtp,
  changePassword,
  getPublicProfile,
  getPublicProfileById,
  getUserStats,
  getDashboardData,
  getProfile,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  updateMyProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  generateTwoFactorSecret,
  verifyTwoFactorSetup,
  disableTwoFactorAuth,
  // Phase 7
  refreshAuthToken,
  logout,
  getActiveSessions,
  revokeAllSessions,
  searchUsers,
  submitContactForm // Added
};