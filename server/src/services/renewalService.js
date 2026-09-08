









import { prisma } from "../config/prisma.js";
import { FRONTEND_URL } from "../config/env.js";
import { sendUserEmail } from "./emailService.js";
import logger from "../utils/logger.js";


const REMINDER_INTERVAL_MS = 12 * 60 * 60 * 1000;





async function sendRenewalReminder(sub, { title, body, subject }) {
  await prisma.notification.create({
    data: { title, body, channels: "inapp,email", sentBy: "system" },
  });
  if (sub.user.email) {
    try {
      await sendUserEmail({
        to: sub.user.email,
        subject,
        title,
        body: `${body}\n\nUpdate your payment details anytime in your account: ${FRONTEND_URL}/subscription`,
      });
    } catch (err) {
      logger.error(`[renewal] reminder email to ${sub.user.email} failed:`, err.message);
    }
  }
}


export async function processExpiredSubscriptions() {
  const now = new Date();

  
  
  await prisma.subscription.updateMany({
    where: { status: "active", autoRenew: false, nextRenewal: { lte: now } },
    data: { status: "expired" },
  });

  const pastDueSubs = await prisma.subscription.findMany({
    where: { status: "past_due" },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  const graceSettings = await prisma.setting.findUnique({ where: { key: "gracePeriodHours" } });
  const graceHours = parseInt(graceSettings?.value || "48");

  for (const sub of pastDueSubs) {
    const graceEnd = new Date(sub.nextRenewal);
    graceEnd.setHours(graceEnd.getHours() - graceHours);

    
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

    
    const failedPayments = await prisma.payment.count({
      where: { subscriptionId: sub.id, status: "failed" },
    });

    if (failedPayments < 3) {
      const timeSinceGrace = now.getTime() - graceEnd.getTime();
      const hoursSinceGrace = timeSinceGrace / (1000 * 60 * 60);

      
      if (hoursSinceGrace >= 12 && failedPayments < 1) {
        await sendRenewalReminder(sub, {
          title: "Payment Reminder",
          subject: "Your Money & Mind renewal needs attention",
          body: `Hi ${sub.user.fullName}, your subscription renewal failed. Please update your payment method.`,
        });
      }

      
      if (hoursSinceGrace >= 24 && failedPayments < 2) {
        await sendRenewalReminder(sub, {
          title: "Final Payment Reminder",
          subject: "Final reminder: your Money & Mind subscription",
          body: `Hi ${sub.user.fullName}, this is your final reminder. Your subscription will be cancelled if payment is not received.`,
        });
      }
    }
  }
}

let renewalTimer = null;


export function startRenewalProcessor() {
  if (renewalTimer) return;
  renewalTimer = setInterval(() => {
    processExpiredSubscriptions().catch((err) => logger.error("[renewal] run failed:", err.message));
  }, REMINDER_INTERVAL_MS);
  renewalTimer.unref();
  processExpiredSubscriptions().catch((err) => logger.error("[renewal] initial run failed:", err.message));
}
