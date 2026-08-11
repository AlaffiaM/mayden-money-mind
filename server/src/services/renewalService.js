// Renewal processor — handles grace period logic for failed subscription renewals
// Runs every 12 hours on server start to process past_due subscriptions
//
// Business rules:
//   1. Failed payment → subscription status becomes "past_due"
//   2. During grace period (default 48h, configurable in Settings):
//      - Reminder 1 sent after 12h
//      - Reminder 2 sent after 24h
//   3. After grace period expires → subscription is auto-cancelled
//
import { prisma } from "../config/prisma.js";
import { sendUserEmail } from "./emailService.js";

// How often to check for expired subscriptions (12 hours)
const REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000;

// Main processor — finds all past_due subscriptions and applies grace period rules
export async function processExpiredSubscriptions() {
  const now = new Date();

  // Subscriptions that reached their renewal date with auto-renew turned off
  // expire cleanly — no charge was attempted, so there's no grace period.
  await prisma.subscription.updateMany({
    where: { status: "active", autoRenew: false, nextRenewal: { lte: now } },
    data: { status: "expired" },
  });

  const pastDueSubs = await prisma.subscription.findMany({
    where: { status: "past_due" },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  for (const sub of pastDueSubs) {
    const graceSettings = await prisma.setting.findUnique({ where: { key: "gracePeriodHours" } });
    const graceHours = parseInt(graceSettings?.value || "48");
    const graceEnd = new Date(sub.nextRenewal);
    graceEnd.setHours(graceEnd.getHours() - graceHours);

    // Grace period fully expired — cancel the subscription
    if (now > sub.nextRenewal) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "cancelled" },
      });

      await prisma.notification.create({
        data: {
          title: "Subscription Cancelled",
          body: `${sub.user.fullName}'s subscription has been cancelled after the grace period expired.`,
          channels: "inapp",
          sentBy: "system",
        },
      });
      continue;
    }

    // Check how many failed payment attempts exist for this subscription
    const failedPayments = await prisma.payment.count({
      where: { subscriptionId: sub.id, status: "failed" },
    });

    if (failedPayments < 3) {
      const timeSinceGrace = now.getTime() - graceEnd.getTime();
      const hoursSinceGrace = timeSinceGrace / (1000 * 60 * 60);

      // First reminder at 12h past grace start
      if (hoursSinceGrace >= 12 && failedPayments < 1) {
        await prisma.notification.create({
          data: {
            title: "Payment Reminder",
            body: `Hi ${sub.user.fullName}, your subscription renewal failed. Please update your payment method.`,
            channels: "inapp,email",
            sentBy: "system",
          },
        });
        if (sub.user.email) {
          await sendUserEmail({
            to: sub.user.email,
            subject: "Your Money & Mind renewal needs attention",
            title: "Payment Reminder",
            body:
              `Hi ${sub.user.fullName},\n\n` +
              `Your subscription renewal failed. Please update your payment method so your subscription stays active.\n\n` +
              `You can update your payment details anytime in your account: ${process.env.FRONTEND_URL || "https://mayden-money-mind.vercel.app"}/subscription`,
          });
        }
      }

      // Final reminder at 24h past grace start
      if (hoursSinceGrace >= 24 && failedPayments < 2) {
        await prisma.notification.create({
          data: {
            title: "Final Payment Reminder",
            body: `Hi ${sub.user.fullName}, this is your final reminder. Your subscription will be cancelled if payment is not received.`,
            channels: "inapp,email",
            sentBy: "system",
          },
        });
        if (sub.user.email) {
          await sendUserEmail({
            to: sub.user.email,
            subject: "Final reminder: your Money & Mind subscription",
            title: "Final Payment Reminder",
            body:
              `Hi ${sub.user.fullName},\n\n` +
              `This is your final reminder. Your subscription will be cancelled if payment is not received. Please update your payment method to keep listening.\n\n` +
              `Update payment details here: ${process.env.FRONTEND_URL || "https://mayden-money-mind.vercel.app"}/subscription`,
          });
        }
      }
    }
  }
}

let renewalTimer = null;

// Starts the processor — runs immediately on first call, then every 12h
export function startRenewalProcessor() {
  if (renewalTimer) return;
  renewalTimer = setInterval(() => {
    processExpiredSubscriptions().catch((err) => console.error("[renewal] run failed:", err.message));
  }, REMINDER_INTERVAL_MS);
  renewalTimer.unref();
  processExpiredSubscriptions().catch((err) => console.error("[renewal] initial run failed:", err.message));
}
