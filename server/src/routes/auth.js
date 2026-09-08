
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


router.post("/login", login);


router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  [body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase()],
  forgotPassword
);


router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("A reset token is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  resetPassword
);


router.post(
  "/verify-email",
  [body("token").isString().withMessage("A verification token is required")],
  verifyEmail
);


router.post(
  "/resend-verification",
  resendVerificationLimiter,
  [body("email").isEmail().withMessage("A valid email is required").normalizeEmail().toLowerCase()],
  resendVerification
);

export default router;
