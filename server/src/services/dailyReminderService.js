



import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";


const CHECK_INTERVAL_MS = 15 * 60 * 1000;


function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}


export async function sendDailyReminder() {
  const now = new Date();

  
  const releaseSetting = await prisma.setting.findUnique({ where: { key: "episodeReleaseTime" } });
  const releaseTime = releaseSetting?.value || "06:00";
  const [hours, minutes] = releaseTime.split(":").map(Number);

  
  const todayCutoff = new Date(now);
  todayCutoff.setHours(hours, minutes, 0, 0);
  if (now < todayCutoff) return;

  
  const today = dateKey(now);
  const marker = await prisma.setting.findUnique({ where: { key: "lastDailyReminderDate" } });
  if (marker?.value === today) return;

  
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

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
