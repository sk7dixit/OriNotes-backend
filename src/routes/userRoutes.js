// src/routes/userRoutes.js
const express = require("express");
const {
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
  updateMyProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPasswordWithOtp,
  generateTwoFactorSecret, // <-- NEW
  verifyTwoFactorSetup,    // <-- NEW
  disableTwoFactorAuth,
  refreshAuthToken,
  logout,
  getActiveSessions,
  revokeAllSessions,
  searchUsers, // Added
  submitContactForm // Added
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// --- AUTHENTICATION ---
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logout);
router.post("/refresh", refreshAuthToken);
router.post("/login-otp-request", requestLoginOtp);
router.post("/login-otp-verify", verifyLoginOtp);
router.post("/social-login", require("../controllers/userController").socialLogin);

// --- ACCOUNT VERIFICATION ---
router.post("/verify-email-otp", verifyEmailOtp);
router.get("/verify-email/:token", verifyEmail);

// --- PASSWORD MANAGEMENT ---
// Phase 6 endpoints (forgot / reset) - REPLACED BY OTP FLOW BELOW
// router.post("/forgot-password", forgotPassword);
// router.post("/reset-password", resetPassword);
router.put("/change-password", authMiddleware, changePassword);

// --- ACTIVE SESSIONS ---
router.get("/sessions", authMiddleware, getActiveSessions);
router.delete("/sessions", authMiddleware, revokeAllSessions);

// --- USER DATA & STATS ---
router.get("/dashboard", authMiddleware, getDashboardData);
router.get("/my-stats", authMiddleware, getUserStats);
router.get("/search", authMiddleware, searchUsers); // Added
router.post('/contact', submitContactForm); // Public access for contact form

// --- PROFILE MANAGEMENT ---
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateMyProfile);
router.get("/profile/:username", authMiddleware, getPublicProfile);
router.get("/public-profile/:id", authMiddleware, getPublicProfileById);

// --- 2FA MANAGEMENT (NEW SECTION) ---
router.post('/2fa/generate-secret', authMiddleware, generateTwoFactorSecret);
router.post('/2fa/verify-setup', authMiddleware, verifyTwoFactorSetup);
router.post('/2fa/disable', authMiddleware, disableTwoFactorAuth);

// 1. Send OTP
router.post("/forgot-password", sendForgotPasswordOtp);

// 2. Verify OTP (Optional check before showing password field)
router.post("/verify-reset-otp", verifyForgotPasswordOtp);

// 3. Set New Password
router.post("/reset-password", resetPasswordWithOtp);

module.exports = router;
