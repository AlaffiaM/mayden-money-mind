import fs from "fs";
import { prisma } from "../config/prisma.js";
import { verifyAudioToken, resolveAudioFile } from "../utils/audioAccessControl.js";

async function isSubscriber(userId) {
  if (!userId) return false;
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    select: { id: true },
  });
  return !!sub;
}

export async function stream(req, res, next) {
  try {
    const result = verifyAudioToken(req.query);
    if (!result) {
      return res.status(403).json({ error: "Invalid or expired audio link" });
    }

    if (result.userId && !(await isSubscriber(result.userId))) {
      return res.status(403).json({ error: "Active subscription required" });
    }

    const absolute = resolveAudioFile(result.filePath);
    if (!absolute || !fs.existsSync(absolute)) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    res.set("Cache-Control", "private, no-store");
    res.sendFile(absolute);
  } catch (err) {
    next(err);
  }
}