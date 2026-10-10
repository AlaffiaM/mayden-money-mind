import { prisma } from "../config/prisma.js";
import {
  sendDailyListeningReminderEmail,
  brevoConfigured,
} from "./emailService.js";
import { businessDateStr, businessToday } from "../utils/businessTime.js";
import logger from "../utils/logger.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_HOUR_WAT = 10;

export async function sendDailyListeningReminders(now = new Date()) {
  const todayStart = businessToday();
  const sendAfter = new Date(
    todayStart.getTime() + REMINDER_HOUR_WAT * 60 * 60 * 1000,
  );
  if (now < sendAfter) return 0;

  if (!brevoConfigured()) {
    logger.warn(
      "[daily-listening-reminder] Brevo is not configured; reminders were not sent",
    );
    return 0;
  }

  const today = businessDateStr(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const episode = await prisma.episode.findFirst({
    where: {
      status: "published",
      publishDate: { gte: todayStart, lt: tomorrowStart },
    },
    orderBy: { createdAt: "desc" },
    select: { title: true },
  });

  if (!episode) return 0;

  const users = await prisma.user.findMany({
    where: {
      email: { not: null },
      emailVerified: { not: null },
      dailyListeningReminderEnabled: true,
      subscriptions: { some: { status: "active" } },
      OR: [
        { dailyListeningReminderDate: null },
        { dailyListeningReminderDate: { not: today } },
      ],
    },
    select: { id: true, fullName: true, email: true },
  });

  let sent = 0;
  for (const user of users) {
    const claim = await prisma.user.updateMany({
      where: {
        id: user.id,
        emailVerified: { not: null },
        dailyListeningReminderEnabled: true,
        subscriptions: { some: { status: "active" } },
        OR: [
          { dailyListeningReminderDate: null },
          { dailyListeningReminderDate: { not: today } },
        ],
      },
      data: { dailyListeningReminderDate: today },
    });
    if (claim.count === 0) continue;

    try {
      const result = await sendDailyListeningReminderEmail({
        to: user.email,
        fullName: user.fullName,
        episodeTitle: episode.title,
      });
      if (!result.sent) {
        await prisma.user.updateMany({
          where: { id: user.id, dailyListeningReminderDate: today },
          data: { dailyListeningReminderDate: null },
        });
        continue;
      }
      sent += 1;
    } catch (err) {
      await prisma.user.updateMany({
        where: { id: user.id, dailyListeningReminderDate: today },
        data: { dailyListeningReminderDate: null },
      });
      logger.error(
        `[daily-listening-reminder] email to user ${user.id} failed:`,
        err.message,
      );
    }
  }

  return sent;
}

let reminderTimer = null;

export function startDailyListeningReminderProcessor() {
  if (reminderTimer) return;

  sendDailyListeningReminders().catch((err) =>
    logger.error("[daily-listening-reminder] initial run failed:", err.message),
  );
  reminderTimer = setInterval(() => {
    sendDailyListeningReminders().catch((err) =>
      logger.error("[daily-listening-reminder] run failed:", err.message),
    );
  }, CHECK_INTERVAL_MS);
  reminderTimer.unref();
}
