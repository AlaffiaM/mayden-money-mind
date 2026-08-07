// Daily reminder service — sends ONE in-app "time to listen" notification per day
// to active subscribers at the configured episode release time (default 06:00).
// This replaces the old per-episode "New Episode" notifications: users get a single
// daily nudge to listen, regardless of how many episodes were dropped that day.
import { prisma } from "../config/prisma.js";

// Runs every 15 minutes to catch the release-time boundary
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// Local date key (YYYY-MM-DD) used for the idempotency marker in the Setting table
function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Sends today's reminder if it's past the release time and one hasn't been sent yet.
export async function sendDailyReminder() {
  const now = new Date();

  // Get configured release time (default 06:00) — same setting the auto-publisher uses
  const releaseSetting = await prisma.setting.findUnique({ where: { key: "episodeReleaseTime" } });
  const releaseTime = releaseSetting?.value || "06:00";
  const [hours, minutes] = releaseTime.split(":").map(Number);

  // Only fire once we're past today's release time
  const todayCutoff = new Date(now);
  todayCutoff.setHours(hours, minutes, 0, 0);
  if (now < todayCutoff) return;

  // Idempotency — exactly one reminder per day
  const today = dateKey(now);
  const marker = await prisma.setting.findUnique({ where: { key: "lastDailyReminderDate" } });
  if (marker?.value === today) return;

  // Personalize the reminder with today's episode when one is published
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

// Starts the processor — runs immediately on first call, then every 15 minutes
export function startDailyReminderProcessor() {
  if (reminderTimer) return;
  reminderTimer = setInterval(() => {
    sendDailyReminder().catch((err) => console.error("[daily-reminder] run failed:", err.message));
  }, CHECK_INTERVAL_MS);
  reminderTimer.unref();
  // Catch up on a missed day at boot, but skip the side-effect in tests
  if (process.env.NODE_ENV !== "test") {
    sendDailyReminder().catch((err) => console.error("[daily-reminder] initial run failed:", err.message));
  }
}
