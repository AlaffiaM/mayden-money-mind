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
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// How often to check for expired subscriptions (12 hours)
const REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000;

// Main processor — finds all past_due subscriptions and applies grace period rules
export async function processExpiredSubscriptions() {
  const now = new Date();

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
            channels: "inapp",
            sentBy: "system",
          },
        });
      }

      // Final reminder at 24h past grace start
      if (hoursSinceGrace >= 24 && failedPayments < 2) {
        await prisma.notification.create({
          data: {
            title: "Final Payment Reminder",
            body: `Hi ${sub.user.fullName}, this is your final reminder. Your subscription will be cancelled if payment is not received.`,
            channels: "inapp",
            sentBy: "system",
          },
        });
      }
    }
  }
}

let renewalTimer = null;

// Starts the processor — runs immediately on first call, then every 12h
export function startRenewalProcessor() {
  if (renewalTimer) return;
  renewalTimer = setInterval(() => {
    processExpiredSubscriptions().catch(() => {});
  }, REMINDER_INTERVAL_MS);
  processExpiredSubscriptions().catch(() => {});
}

// Stops the processor (useful for graceful shutdown)
export function stopRenewalProcessor() {
  if (renewalTimer) {
    clearInterval(renewalTimer);
    renewalTimer = null;
  }
}
