import { prisma } from "../config/prisma.js";
import { businessDateStr, businessToday } from "../utils/businessTime.js";
import logger from "../utils/logger.js";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Send today's episode reminder
export async function sendDailyReminder() {
  const now = new Date();

  const releaseSetting = await prisma.setting.findUnique({ where: { key: "episodeReleaseTime" } });
  const releaseTime = releaseSetting?.value || "06:00";
  const [hours, minutes] = releaseTime.split(":").map(Number);

  const todayStart = businessToday();
  const todayCutoff = new Date(
    todayStart.getTime() + (hours * 60 + minutes) * 60 * 1000,
  );
  if (now < todayCutoff) return;

  const today = businessDateStr(now);
  const marker = await prisma.setting.findUnique({ where: { key: "lastDailyReminderDate" } });
  if (marker?.value === today) return;

  const dayStart = todayStart;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayEpisode = await prisma.episode.findFirst({
    where: {
      status: "published",
      publishDate: { gte: dayStart, lt: dayEnd },
    },
  });

  await prisma.notification.create({
    data: {
      title: "Time to Listen",
      body: todayEpisode
        ? `Today's episode "${todayEpisode.title}" is ready — tap to listen.`
        : "Your Money & Mind audio for today is ready — tap to listen.",
      channels: "inapp",
      sentBy: "system",
      subscribersOnly: true,
    },
  });

  await prisma.setting.upsert({
    where: { key: "lastDailyReminderDate" },
    update: { value: today },
    create: { key: "lastDailyReminderDate", value: today },
  });
}

let reminderTimer = null;

// Run daily reminder sweep
export function startDailyReminderProcessor() {
  if (reminderTimer) return;
  reminderTimer = setInterval(() => {
    sendDailyReminder().catch((err) => logger.error("[daily-reminder] run failed:", err.message));
  }, CHECK_INTERVAL_MS);
  reminderTimer.unref();

  if (process.env.NODE_ENV !== "test") {
    sendDailyReminder().catch((err) => logger.error("[daily-reminder] initial run failed:", err.message));
  }
}
