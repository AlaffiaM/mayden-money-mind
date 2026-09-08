
import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";
import { consumeVerificationToken, createVerificationToken } from "../services/verificationService.js";
import { sendVerificationEmail } from "../services/emailService.js";





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

  
  res.json({ success: true });
}
