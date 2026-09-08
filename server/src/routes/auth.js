import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";
import { verifyEmail, resendVerification } from "../controllers/verificationController.js";

const router = Router();

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many reset requests. Please try again later." },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many resend requests. Please try again later." },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many verification attempts. Please try again later." },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many reset attempts. Please try again later." },
});

// Register a new user
router.post(
  "/register",
  [
    body("fullName").trim().isLength({ min: 2, max: 100 }).withMessage("A valid full name is required"),
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("phone").optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 20 }).withMessage("Phone number is invalid"),
  ],
  register
);

// Log in an existing user
router.post("/login", login);

// Send password reset email
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase()],
  forgotPassword
);

// Set new password using a reset code
router.post(
  "/reset-password",
  resetPasswordLimiter,
  [
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase(),
    body("code").matches(/^\d{6}$/).withMessage("Enter the 6-digit code from your email"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  resetPassword
);

// Confirm email with a 6-digit verification code
router.post(
  "/verify-email",
  verifyLimiter,
  [
    body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase(),
    body("code").matches(/^\d{6}$/).withMessage("Enter the 6-digit code from your email"),
  ],
  verifyEmail
);

// Resend email verification
router.post(
  "/resend-verification",
  resendVerificationLimiter,
  [body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase()],
  resendVerification
);

export default router;
