import { prisma } from "../config/prisma.js";
import { brevoConfigured, sendEmail } from "./emailService.js";
import logger from "../utils/logger.js";

const RECONCILIATION_EMAIL = process.env.RECONCILIATION_EMAIL || "";
const RECONCILIATION_HOUR = parseInt(process.env.RECONCILIATION_HOUR || "23", 10);
const MONTHLY_REPORT_HOUR = parseInt(process.env.MONTHLY_REPORT_HOUR || "23", 10);
const MONTHLY_REPORT_DAY = parseInt(process.env.MONTHLY_REPORT_DAY || "1", 10);

function esc(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function sendReconciliationEmail({ csv, from, kind = "Daily", label }) {
  const labelValue = label || from.toISOString().slice(0, 10);
  const subject = `${kind} Payment Reconciliation — ${labelValue}`;
  const text = `${kind} payment reconciliation report for ${labelValue} attached.`;

  if (brevoConfigured() && RECONCILIATION_EMAIL) {
    await sendEmail({
      to: RECONCILIATION_EMAIL,
      subject,
      textContent: text,
      attachment: {
        name: `payments-${labelValue}.csv`,
        content: Buffer.from(csv, "utf-8").toString("base64"),
      },
    });
    return { sent: true, via: "brevo" };
  }

  console.log("[reconciliation] email skipped — set BREVO_API_KEY, BREVO_FROM_EMAIL, RECONCILIATION_EMAIL");
  return { sent: false, reason: "brevo not configured" };
}

async function buildPaymentsCsv({ from, to }) {
  const payments = await prisma.payment.findMany({
    where: { status: "success", paidAt: { gte: from, lt: to } },
    include: {
      user: { select: { email: true, phone: true } },
      subscription: { select: { plan: true } },
    },
    orderBy: { paidAt: "asc" },
  });

  const rows = [
    ["Transaction Date & Time", "Customer Identifier", "Subscription Tier", "Amount (NGN)", "Paystack Reference", "Payment Status"],
    ...payments.map((p) => [
      (p.paidAt || p.createdAt).toISOString(),
      p.user.email || p.user.phone || "",
      p.subscription.plan === "weekly" ? "Weekly (₦100)" : "Monthly (₦350)",
      p.amount,
      p.reference,
      p.status,
    ]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return { csv, count: payments.length };
}

async function runReconciliationForWindow({ from, to, kind = "Daily", label }) {
  const { csv, count } = await buildPaymentsCsv({ from, to });
  const result = await sendReconciliationEmail({ csv, from, kind, label });
  const labelValue = label || from.toISOString().slice(0, 10);
  console.log(`[reconciliation] ${kind} ${labelValue}: ${count} payment(s), email ${result.sent ? "sent" : "skipped: " + result.reason}`);
  return { date: labelValue, kind, count, ...result };
}

async function runDailyReconciliation(day = new Date()) {
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return runReconciliationForWindow({ from: start, to: end, kind: "Daily" });
}

function previousMonthWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: start, to: end, label: start.toISOString().slice(0, 7) };
}

async function runMonthlyReconciliation(now = new Date()) {
  const { from, to, label } = previousMonthWindow(now);
  return runReconciliationForWindow({ from, to, kind: "Monthly", label });
}

export function startReconciliationProcessor() {
  const tick = async () => {
    const now = new Date();
    const hour = now.getUTCHours();

    if (hour === RECONCILIATION_HOUR) {
      const today = now.toISOString().slice(0, 10);
      const last = await prisma.setting.findUnique({ where: { key: "lastReconciliationDate" } });
      if (last?.value !== today) {
        try {
          const day = new Date(now);
          day.setUTCDate(day.getUTCDate() - 1);
          const result = await runDailyReconciliation(day);
          if (result.sent) {
            await prisma.setting.upsert({
              where: { key: "lastReconciliationDate" },
              update: { value: today },
              create: { key: "lastReconciliationDate", value: today },
            });
          }
        } catch (err) {
          console.error("[reconciliation] daily job failed:", err.message);
        }
      }
    }

    if (hour === MONTHLY_REPORT_HOUR && now.getUTCDate() === MONTHLY_REPORT_DAY) {
      const { label } = previousMonthWindow(now);
      const last = await prisma.setting.findUnique({ where: { key: "lastMonthlyReport" } });
      if (last?.value !== label) {
        try {
          const result = await runMonthlyReconciliation(now);
          if (result.sent) {
            await prisma.setting.upsert({
              where: { key: "lastMonthlyReport" },
              update: { value: label },
              create: { key: "lastMonthlyReport", value: label },
            });
          }
        } catch (err) {
          console.error("[reconciliation] monthly job failed:", err.message);
        }
      }
    }
  };

  const timer = setInterval(tick, 60 * 60 * 1000);
  timer.unref();
  tick();
  console.log(`   - Reconciliation reports (daily at ${RECONCILIATION_HOUR}:00 UTC, monthly on day ${MONTHLY_REPORT_DAY} at ${MONTHLY_REPORT_HOUR}:00 UTC)`);
  return timer;
}
