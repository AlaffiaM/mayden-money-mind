import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import { prisma } from "../config/prisma.js";
import { JWT_SECRET } from "../config/env.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/emailService.js";
import { createVerificationToken } from "../services/verificationService.js";
import logger from "../utils/logger.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

export function issueToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
}

export function serializeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified ? true : false,
  };
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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

        utmSource: req.body.utmSource || null,
        utmMedium: req.body.utmMedium || null,
        utmCampaign: req.body.utmCampaign || null,
        utmTerm: req.body.utmTerm || null,
        utmContent: req.body.utmContent || null,
      },
    });

    if (user.role !== "admin") {
      const code = await createVerificationToken(user.id);
      try {
        await sendVerificationEmail({ to: user.email, fullName: user.fullName, code });
      } catch (err) {

        logger.error("[verify] welcome verification email failed:", err.message);
      }
    }

    res.status(201).json({ token: issueToken(user), user: serializeUser(user) });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function login(req, res) {
  try {
    const email = (req.body.email || "").toString().trim().toLowerCase();
    const password = req.body.password;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Account not found" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role !== "admin" && !user.emailVerified) {
      const code = await createVerificationToken(user.id);
      try {
        await sendVerificationEmail({ to: user.email, fullName: user.fullName, code });
      } catch (err) {
        logger.error("[verify] login verification email failed:", err.message);
      }
    }

    res.json({ token: issueToken(user), user: serializeUser(user) });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function forgotPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const email = (req.body.email || "").toString().trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashResetToken(code),
          resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          resetPasswordAttempts: 0,
        },
      });

      const result = await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        code,
      });

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

export async function resetPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const email = (req.body.email || "").toString().trim().toLowerCase();
    const code = (req.body.code || "").toString().trim();
    const { password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({ error: "That reset code is invalid. Please request a new one." });
    }
    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ error: "This reset code has expired. Please request a new one." });
    }
    if (hashResetToken(code) !== user.resetPasswordToken) {
      const attempts = user.resetPasswordAttempts + 1;
      if (attempts >= MAX_RESET_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { resetPasswordToken: null, resetPasswordExpires: null },
        });
        return res.status(400).json({ error: "Too many wrong attempts. Please request a new code." });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { resetPasswordAttempts: attempts },
      });
      return res.status(400).json({ error: "That reset code is incorrect. Please check it and try again." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null, resetPasswordAttempts: 0 },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
