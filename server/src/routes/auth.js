// Auth routes — user registration, login, and password reset with JWT token generation
import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";

const router = Router();

// Tighter limit on forgot-password to stop email bombing (the /api/auth mount already limits to 30/15min)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many reset requests. Please try again later." },
});

// POST /api/auth/register
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

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase()],
  forgotPassword
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("A reset token is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  resetPassword
);

export default router;
