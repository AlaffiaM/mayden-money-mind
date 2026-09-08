import { prisma } from "../config/prisma.js";
import { sendSubscriptionReminderEmail } from "./emailService.js";
import logger from "../utils/logger.js";

const SWEEP_INTERVAL_MS = 12 * 60 * 60 * 1000;
const LAPSE_WINDOW_DAYS = 7;

// Email a one-time nudge to users whose subscription lapsed recently
export async function sendSubscribeReminders() {
  const cutoff = new Date(Date.now() - LAPSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      emailVerified: { not: null },
      subscribeReminderSentAt: null,
      subscriptions: {
        some: {
          status: { in: ["expired", "cancelled"] },
          nextRenewal: { gte: cutoff },
        },
        none: { status: "active" },
      },
    },
    select: { id: true, fullName: true, email: true },
  });

  let emailed = 0;

  for (const user of users) {
    if (!user.email) continue;
    try {
      await sendSubscriptionReminderEmail({
        to: user.email,
        fullName: user.fullName,
      });

      await prisma.notification.create({
        data: {
          title: "Your subscription has lapsed",
          body: `${user.fullName}, renew your Money & Mind subscription to keep listening to your library.`,
          channels: "inapp",
          sentBy: "system",
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { subscribeReminderSentAt: new Date() },
      });

      emailed += 1;
    } catch (err) {
      logger.error(`[subscribe-reminder] email to ${user.email} failed:`, err.message);
    }
  }

  return emailed;
}

let sweepTimer = null;

// Run the subscribe-reminder sweep every 12 hours
export function startSubscribeReminderProcessor() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    sendSubscribeReminders().catch((err) => logger.error("[subscribe-reminder] run failed:", err.message));
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref();

  if (process.env.NODE_ENV !== "test") {
    sendSubscribeReminders().catch((err) => logger.error("[subscribe-reminder] initial run failed:", err.message));
  }
}