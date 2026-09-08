import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";

export const VERIFICATION_TTL_MS = 30 * 60 * 1000;
export const MAX_VERIFICATION_ATTEMPTS = 5;

// Generate a 6-digit numeric verification code
export function generateVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Generate + store a verification code with 30-minute expiry
export async function createVerificationToken(userId) {
  const code = generateVerificationCode();
  await prisma.verificationToken.create({
    data: {
      userId,
      type: "email",
      tokenHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });
  return code;
}

// Validate and consume the latest verification code for a user
export async function consumeVerificationCode(userId, code) {
  if (!code || typeof code !== "string") return { ok: false, reason: "invalid" };

  const latest = await prisma.verificationToken.findFirst({
    where: { userId, type: "email" },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return { ok: false, reason: "invalid" };
  if (latest.usedAt) return { ok: false, reason: "used" };
  if (latest.expiresAt < new Date()) {
    await prisma.verificationToken.update({
      where: { id: latest.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, reason: "expired" };
  }

  if (hashVerificationCode(code) !== latest.tokenHash) {
    const attempts = latest.attempts + 1;
    if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await prisma.verificationToken.update({
        where: { id: latest.id },
        data: { usedAt: new Date(), attempts },
      });
      return { ok: false, reason: "invalid" };
    }
    await prisma.verificationToken.update({
      where: { id: latest.id },
      data: { attempts },
    });
    return { ok: false, reason: "invalid" };
  }

  await prisma.verificationToken.update({
    where: { id: latest.id },
    data: { usedAt: new Date() },
  });

  await prisma.$transaction([
    prisma.user.update({ where: { id: latest.userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.updateMany({
      where: { userId: latest.userId, type: "email", usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, userId: latest.userId };
}