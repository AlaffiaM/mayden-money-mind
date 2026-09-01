// Email verification service — secure token generation and single-use consumption.
// Mirrors the proven password-reset pattern: only the sha256 hash of the token is
// ever stored, never the raw token. Tokens expire and are single-use.
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// 48 bytes of CSPRNG entropy → 128 hex chars. Cryptographically secure.
export function generateVerificationToken() {
  return crypto.randomBytes(48).toString("hex");
}

// sha256 — the same one-way hash used for password-reset tokens.
export function hashVerificationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Creates a fresh verification token for a user, invalidating any previous ones
// so only the latest email link works (avoids a stale-link confusing the user).
// Returns the RAW token so the caller can put it in the email link.
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

// Consumes a verification token atomically and marks the user email verified.
// Returns one of:
//   { ok: true }
//   { ok: false, reason: "expired" | "used" | "invalid" }
// Single-use: the token row is marked used and can never succeed again.
export async function consumeVerificationToken(raw) {
  if (!raw || typeof raw !== "string") return { ok: false, reason: "invalid" };

  const token = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashVerificationToken(raw) },
  });

  if (!token) return { ok: false, reason: "invalid" };
  if (token.usedAt) return { ok: false, reason: "used" };
  if (token.expiresAt < new Date()) {
    // Mark expired tokens used so they can't be retried, and so the upsert
    // in resend end-of-life cleanup has a stable shape.
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
    return { ok: false, reason: "expired" };
  }

  // Mark used first, then verify — a concurrent double-click can't consume twice.
  await prisma.verificationToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });

  // The token belonging to the user id is authoritative (looked up via the token).
  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.updateMany({
      where: { userId: token.userId, type: "email", usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

// Marks a user's email verified directly (used when an admin is created by seed).
export async function markEmailVerified(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}
