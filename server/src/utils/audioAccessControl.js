// Audio access control — HMAC-signed, short-lived URLs for episode audio files.
//
// Why signed URLs? The <audio> element can't send Authorization headers, so we
// issue URLs like /api/audio?file=...&exp=...&sig=... where sig is an HMAC over
// the file path + expiry. Subscribers/admins receive fresh signed URLs from the
// API; the file itself is never served from a public static directory.
//
// Roots (all resolved relative to this file, server/src/utils/):
//   - /uploads/*   → server/uploads/            (admin-uploaded episode audio)
//   - /audio/*     → server/storage/audio/      (migrated content files)
//   - public sample → client/public/audio/      (whitelisted, no token required)
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const STORAGE_AUDIO_DIR = path.join(__dirname, "../../storage/audio");
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../../../client/public/audio");

// Files intentionally served without a token (the free marketing sample)
const PUBLIC_FILES = ["/audio/Maiden Microfinance Bank MONDAY.mp3.mpeg"];

// Default token lifetime in seconds — kept very short so a copied link is
// useless by the time someone tries to reuse it. Fresh URLs are minted on play.
const DEFAULT_TTL_SECONDS = 60;

function sign(filePath, expires) {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${filePath}|${expires}`)
    .digest("hex");
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Builds a signed /api/audio URL for a stored file path (e.g. "/audio/Maiden/x.mp3")
export function signAudioUrl(filePath, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const expires = Date.now() + ttlSeconds * 1000;
  const sig = sign(filePath, expires);
  return `/api/audio?file=${encodeURIComponent(filePath)}&exp=${expires}&sig=${sig}`;
}

// Returns the file path if the query token is valid (or the file is public), else null
export function verifyAudioToken(query) {
  const filePath = query?.file;
  if (!filePath || typeof filePath !== "string") return null;
  if (isPublicFile(filePath)) return filePath;

  const expires = parseInt(query?.exp, 10);
  const sig = query?.sig;
  if (!expires || !sig || expires < Date.now()) return null;
  if (!safeEqual(sign(filePath, expires), sig)) return null;
  return filePath;
}

export function isPublicFile(filePath) {
  return PUBLIC_FILES.includes(filePath);
}

// Resolves a stored path to an absolute filesystem path under an allowed root.
// Returns null for traversal attempts, absolute paths, or unknown locations.
export function resolveAudioFile(filePath) {
  if (!filePath || typeof filePath !== "string") return null;

  // Canonical paths may be URL-encoded (existing DB rows store e.g.
  // "/audio/Maiden/Maiden%20Microfinance%20Bank%20Friday%201.mp3")
  let normalized;
  try {
    normalized = decodeURIComponent(filePath);
  } catch {
    return null;
  }

  normalized = normalized.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;

  let root;
  let rel;
  if (normalized.startsWith("uploads/")) {
    root = UPLOADS_DIR;
    rel = normalized.slice("uploads/".length);
  } else if (normalized.startsWith("audio/")) {
    if (isPublicFile(`/${normalized}`)) {
      root = PUBLIC_AUDIO_DIR;
      rel = normalized.slice("audio/".length);
    } else {
      root = STORAGE_AUDIO_DIR;
      rel = normalized.slice("audio/".length);
    }
  } else {
    return null;
  }

  const absolute = path.resolve(root, rel);
  // Defense in depth: resolved path must stay inside the allowed root
  if (!absolute.startsWith(path.resolve(root) + path.sep)) return null;
  return absolute;
}
