import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOADS_DIR = path.join(__dirname, "../../uploads");
const STORAGE_AUDIO_DIR = path.join(__dirname, "../../storage/audio");
const PUBLIC_AUDIO_DIR = path.join(__dirname, "../../../client/public/audio");

const PUBLIC_FILES = ["/audio/Maiden Microfinance Bank MONDAY.mp3.mpeg"];

const DEFAULT_TTL_SECONDS = 60;

function sign(filePath, expires, userId) {
  const msg = userId ? `${filePath}|${expires}|${userId}` : `${filePath}|${expires}`;
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(msg)
    .digest("hex");
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function signAudioUrl(filePath, optionsOrTtl = {}) {
  let ttlSeconds = DEFAULT_TTL_SECONDS;
  let userId = null;

  if (typeof optionsOrTtl === "number") {
    ttlSeconds = optionsOrTtl;
  } else {
    ttlSeconds = optionsOrTtl.ttl ?? DEFAULT_TTL_SECONDS;
    userId = optionsOrTtl.userId ?? null;
  }

  const expires = Date.now() + ttlSeconds * 1000;
  const sig = sign(filePath, expires, userId);
  const u = userId ? `&u=${userId}` : "";
  return `/api/audio?file=${encodeURIComponent(filePath)}&exp=${expires}${u}&sig=${sig}`;
}

export function verifyAudioToken(query) {
  const filePath = query?.file;
  if (!filePath || typeof filePath !== "string") return null;
  if (isPublicFile(filePath)) return { filePath, userId: null };

  const expires = parseInt(query?.exp, 10);
  const sig = query?.sig;
  const uRaw = query?.u;
  const userId = uRaw ? parseInt(uRaw, 10) : null;
  if (uRaw && !Number.isInteger(userId)) return null;
  if (!expires || !sig || expires < Date.now()) return null;
  if (!safeEqual(sign(filePath, expires, userId), sig)) return null;
  return { filePath, userId };
}

function isPublicFile(filePath) {
  return PUBLIC_FILES.includes(filePath);
}

export function resolveAudioFile(filePath) {
  if (!filePath || typeof filePath !== "string") return null;

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

  if (!absolute.startsWith(path.resolve(root) + path.sep)) return null;
  return absolute;
}
