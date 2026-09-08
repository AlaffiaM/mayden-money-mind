import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";
import { consumeVerificationCode, createVerificationToken } from "../services/verificationService.js";
import { sendVerificationEmail } from "../services/emailService.js";
import { issueToken, serializeUser } from "./authController.js";

export async function verifyEmail(req, res) {
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  const code = (req.body?.code || "").toString().trim();

  if (!email) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Enter the 6-digit code from your email." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(400).json({ error: "No account was found for this email." });
  }
  if (user.emailVerified) {
    return res.status(400).json({ error: "This email has already been verified." });
  }

  const result = await consumeVerificationCode(user.id, code);

  switch (result.reason) {
    case "expired":
      return res.status(410).json({ error: "This verification code has expired. Please request a new one." });
    case "used":
      return res.status(410).json({ error: "This verification code has already been used." });
    case "invalid":
      return res.status(400).json({
        error: "That code isn't correct. Watch for the 6 digits, and note the code expires after 5 wrong attempts.",
      });
    default:
      return res.json({ success: true, token: issueToken(user), user: serializeUser(user) });
  }
}

export async function resendVerification(req, res) {
  const email = (req.body?.email || "").toString().trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified && user.role !== "admin") {
    const code = await createVerificationToken(user.id);
    try {
      await sendVerificationEmail({ to: user.email, fullName: user.fullName, code });
    } catch (err) {
      logger.error("[verify] resend email failed:", err.message);
    }
  }

  res.json({ success: true });
}