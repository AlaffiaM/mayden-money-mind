import { validationResult } from "express-validator";
import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";

export async function getPreferences(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { dailyListeningReminderEnabled: true },
    });
    if (!user) return res.status(404).json({ error: "Account not found" });
    res.json(user);
  } catch (err) {
    logger.error("[account] failed to load preferences:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updatePreferences(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        dailyListeningReminderEnabled:
          req.body.dailyListeningReminderEnabled,
      },
      select: { dailyListeningReminderEnabled: true },
    });
    res.json(user);
  } catch (err) {
    logger.error("[account] failed to update preferences:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
