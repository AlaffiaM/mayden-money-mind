// Auth handlers — registration, login, and password reset with JWT token generation
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { prisma } from "../config/prisma.js";
import { JWT_SECRET, FRONTEND_URL } from "../config/env.js";
import { sendUserEmail, sendVerificationEmail } from "../services/emailService.js";
import { createVerificationToken } from "../services/verificationService.js";
import logger from "../utils/logger.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function issueToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified ? true : false,
  };
}

// Password reset tokens are stored as sha256 hashes so a DB leak can't be used to take over accounts
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/register
export async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { fullName, email, phone, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return res.status(409).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        // New self-service accounts start unverified (emailVerified = null).
        // Admins are created via seed and auto-verified there.
        utmSource: req.body.utmSource || null,
        utmMedium: req.body.utmMedium || null,
        utmCampaign: req.body.utmCampaign || null,
        utmTerm: req.body.utmTerm || null,
        utmContent: req.body.utmContent || null,
      },
    });

    // Send a verification email for self-serve accounts.
    if (user.role !== "admin") {
      const token = await createVerificationToken(user.id);
      try {
        await sendVerificationEmail({ to: user.email, fullName: user.fullName, token });
      } catch (err) {
        // A mail outage must not block account creation — the user can resend later.
        logger.error("[verify] welcome verification email failed:", err.message);
      }
    }

    res.status(201).json({ token: issueToken(user), user: serializeUser(user) });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/login
export async function login(req, res) {
  try {
    const email = (req.body.email || "").toString().trim().toLowerCase();
    const password = req.body.password;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ token: issueToken(user), user: serializeUser(user) });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const email = (req.body.email || "").toString().trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond with success — never reveal whether an account exists
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashResetToken(token),
          resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
      const result = await sendUserEmail({
        to: user.email,
        subject: "Reset your Money & Mind password",
        title: "Reset your password",
        body:
          `Hi ${user.fullName},\n\n` +
          `You asked to reset your Money & Mind password. Click the link below to choose a new one (valid for 30 minutes):\n\n` +
          `${resetUrl}\n\n` +
          `If you didn't request this, you can safely ignore this email.`,
      });

      // Dev mode: email is skipped without Brevo keys — log the link instead
      if (!result.sent) {
        logger.info(`[password-reset] email sending attempted, sent=${result.sent}`);
      }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const { token, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: hashResetToken(token) },
    });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: "This reset link is invalid or has expired" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
