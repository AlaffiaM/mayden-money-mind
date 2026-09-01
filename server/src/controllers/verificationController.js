// Email verification handlers — consume a verification token and resend the email.
import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";
import { consumeVerificationToken, createVerificationToken } from "../services/verificationService.js";
import { sendVerificationEmail } from "../services/emailService.js";

// POST /api/auth/verify-email — body: { token }
// Public (no auth). Consumes a single-use token and marks the user verified.
// Responses intentionally don't reveal whether the token mapped to a real account
// beyond the clear success/expired/used/invalid states required by the UI.
export async function verifyEmail(req, res) {
  const { token } = req.body || {};
  const result = await consumeVerificationToken(typeof token === "string" ? token : "");

  switch (result.reason) {
    case "expired":
      return res.status(410).json({ error: "This verification link has expired. Please request a new one." });
    case "used":
      return res.status(410).json({ error: "This verification link has already been used." });
    case "invalid":
      return res.status(400).json({ error: "This verification link is invalid." });
    default:
      return res.json({ success: true });
  }
}

// POST /api/auth/resend-verification — body: { email }
// Rate limited (see routes). Never reveals whether the email is registered — the
// response is identical regardless, mirroring the forgot-password anti-enumeration
// design. Resending also invalidates previously issued tokens (single effective link).
export async function resendVerification(req, res) {
  const email = (req.body?.email || "").toString().trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified && user.role !== "admin") {
    const token = await createVerificationToken(user.id);
    try {
      await sendVerificationEmail({ to: user.email, fullName: user.fullName, token });
    } catch (err) {
      logger.error("[verify] resend email failed:", err.message);
    }
  }

  // Always 200 — do not reveal whether the account exists.
  res.json({ success: true });
}
