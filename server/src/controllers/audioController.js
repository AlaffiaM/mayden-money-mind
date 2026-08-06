// Protected audio streaming handler.
// GET /api/audio?file=<path>&exp=<ts>&sig=<hmac>
// Serves files only when the HMAC signature is valid and unexpired (or the file
// is on the public sample whitelist). res.sendFile handles Range requests.
import fs from "fs";
import { verifyAudioToken, resolveAudioFile } from "../utils/audioAccessControl.js";

export function stream(req, res, next) {
  try {
    const filePath = verifyAudioToken(req.query);
    if (!filePath) {
      return res.status(403).json({ error: "Invalid or expired audio link" });
    }

    const absolute = resolveAudioFile(filePath);
    if (!absolute || !fs.existsSync(absolute)) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    res.sendFile(absolute);
  } catch (err) {
    next(err);
  }
}
