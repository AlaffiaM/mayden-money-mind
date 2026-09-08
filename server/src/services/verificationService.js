import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerificationToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function hashVerificationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createVerificationToken(userId) {
  const raw = generateVerificationToken();
  await prisma.verificationToken.create({
    data: {
      userId,
      type: "email",
      tokenHash: hashVerificationToken(raw),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });
  return raw;
}

export async function consumeVerificationToken(raw) {
  if (!raw || typeof raw !== "string") return { ok: false, reason: "invalid" };

  const token = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashVerificationToken(raw) },
  });

  if (!token) return { ok: false, reason: "invalid" };
  if (token.usedAt) return { ok: false, reason: "used" };
  if (token.expiresAt < new Date()) {

    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, reason: "expired" };
  }

  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.updateMany({
      where: { userId: token.userId, type: "email", usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
