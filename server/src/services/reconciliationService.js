// Daily payment reconciliation — builds a CSV of successful payments and emails
// it to the finance team. The same CSV builder powers the admin on-demand export.
import { prisma } from "../config/prisma.js";

const RECONCILIATION_EMAIL = process.env.RECONCILIATION_EMAIL || "";
const RECONCILIATION_HOUR = parseInt(process.env.RECONCILIATION_HOUR || "23", 10); // 23:00 UTC = midnight Lagos

// Brevo transactional email REST API — the only email path
function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL && RECONCILIATION_EMAIL);
}

function esc(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Sends the CSV via the Brevo transactional email API
async function sendBrevoEmail({ csv, date, subject, text }) {
  const attachment = {
    name: `payments-${date}.csv`,
    content: Buffer.from(csv, "utf-8").toString("base64"),
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Money & Mind", email: process.env.BREVO_FROM_EMAIL },
      to: [{ email: RECONCILIATION_EMAIL }],
      subject,
      textContent: text,
      attachment: [attachment],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API ${response.status}: ${body.slice(0, 200)}`);
  }
}

// Emails the CSV to the finance team via Brevo — no-op when not configured
export async function sendReconciliationEmail({ csv, from }) {
  const date = from.toISOString().slice(0, 10);
  const subject = `Daily Payment Reconciliation — ${date}`;
  const text = `Daily payment reconciliation report for ${date} attached.`;

  if (brevoConfigured()) {
    await sendBrevoEmail({ csv, date, subject, text });
    return { sent: true, via: "brevo" };
  }

  console.log("[reconciliation] email skipped — set BREVO_API_KEY, BREVO_FROM_EMAIL, RECONCILIATION_EMAIL");
  return { sent: false, reason: "brevo not configured" };
}

// Builds the reconciliation CSV for payments paid between `from` (inclusive) and `to` (exclusive)
export async function buildPaymentsCsv({ from, to }) {
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
  return { csv: rows.map((r) => r.map(esc).join(",")).join("\r\n"), count: payments.length };
}

// Builds + sends the report for a given day (UTC). Returns the summary.
export async function runDailyReconciliation(day = new Date()) {
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { csv, count } = await buildPaymentsCsv({ from: start, to: end });
  const result = await sendReconciliationEmail({ csv, from: start });
  console.log(`[reconciliation] ${start.toISOString().slice(0, 10)}: ${count} payment(s), email ${result.sent ? "sent" : "skipped: " + result.reason}`);
  return { date: start.toISOString().slice(0, 10), count, ...result };
}

// Interval job — checks hourly and fires once per day at RECONCILIATION_HOUR UTC.
// Deduped via the lastReconciliationDate Setting so restarts can't double-send.
export function startReconciliationProcessor() {
  const tick = async () => {
    const now = new Date();
    if (now.getUTCHours() !== RECONCILIATION_HOUR) return;

    const today = now.toISOString().slice(0, 10);
    const last = await prisma.setting.findUnique({ where: { key: "lastReconciliationDate" } });
    if (last?.value === today) return;

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
      console.error("[reconciliation] job failed:", err.message);
    }
  };

  const timer = setInterval(tick, 60 * 60 * 1000);
  tick();
  console.log(`   - Reconciliation report (daily at ${RECONCILIATION_HOUR}:00 UTC)`);
  return timer;
}
