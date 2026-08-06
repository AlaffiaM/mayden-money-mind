// Auth routes — user registration and login with JWT token generation
import { Router } from "express";
import { body } from "express-validator";
import { register, login } from "../controllers/authController.js";

const router = Router();

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

export default router;
