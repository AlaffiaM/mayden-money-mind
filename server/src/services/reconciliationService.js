import { prisma } from "../config/prisma.js";
import { brevoConfigured, emailTemplate, sendEmail } from "./emailService.js";
import logger from "../utils/logger.js";

const RECONCILIATION_EMAIL = process.env.RECONCILIATION_EMAIL || "";
const RECONCILIATION_HOUR = parseInt(
  process.env.RECONCILIATION_HOUR || "23",
  10,
);
const MONTHLY_REPORT_HOUR = parseInt(
  process.env.MONTHLY_REPORT_HOUR || "23",
  10,
);
const MONTHLY_REPORT_DAY = parseInt(process.env.MONTHLY_REPORT_DAY || "1", 10);

function esc(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Email a CSV of payments for the window
async function sendReconciliationEmail({ csv, from, kind = "Daily", label }) {
  const labelValue = label || from.toISOString().slice(0, 10);
  const subject = `${kind} Payment Reconciliation — ${labelValue}`;
  const text = `The ${kind.toLowerCase()} payment reconciliation report for ${labelValue} is attached.`;

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

  console.log(
    "[reconciliation] email skipped — set BREVO_API_KEY, BREVO_FROM_EMAIL, RECONCILIATION_EMAIL",
  );
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
    [
      "Transaction Date & Time",
      "Customer Identifier",
      "Subscription Tier",
      "Amount (NGN)",
      "Paystack Reference",
      "Payment Status",
    ],
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
  console.log(
    `[reconciliation] ${kind} ${labelValue}: ${count} payment(s), email ${result.sent ? "sent" : "skipped: " + result.reason}`,
  );
  return { date: labelValue, kind, count, ...result };
}

async function runDailyReconciliation(day = new Date()) {
  const start = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return runReconciliationForWindow({ from: start, to: end, kind: "Daily" });
}

function previousMonthWindow(now = new Date()) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: start, to: end, label: start.toISOString().slice(0, 7) };
}

async function buildSubscriptionsCsv({ from, to }) {
  const subscriptions = await prisma.subscription.findMany({
    where: { createdAt: { gte: from, lt: to } },
    include: { user: { select: { fullName: true, email: true, phone: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = [
    [
      "Subscription ID",
      "User ID",
      "Full Name",
      "Email",
      "Phone",
      "Plan",
      "Status",
      "Started",
      "Next Renewal",
      "Auto-Renew",
    ],
    ...subscriptions.map((s) => [
      s.id,
      s.userId,
      s.user.fullName || "",
      s.user.email || "",
      s.user.phone || "",
      s.plan,
      s.status,
      s.startDate.toISOString(),
      s.nextRenewal ? s.nextRenewal.toISOString() : "",
      s.autoRenew ? "yes" : "no",
    ]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return { csv, count: subscriptions.length };
}

async function buildUsersCsv({ from, to }) {
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      _count: { select: { listenLogs: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = [
    [
      "User ID",
      "Full Name",
      "Email",
      "Phone",
      "Role",
      "Email Verified",
      "Registered",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "Episodes Listened",
    ],
    ...users.map((u) => [
      u.id,
      u.fullName,
      u.email || "",
      u.phone || "",
      u.role,
      u.emailVerified ? "yes" : "no",
      u.createdAt.toISOString(),
      u.utmSource || "",
      u.utmMedium || "",
      u.utmCampaign || "",
      u._count.listenLogs,
    ]),
  ];
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return { csv, count: users.length };
}

async function buildMonthlySummary({ from, to }) {
  const [
    paymentsAgg,
    failedCount,
    subscriptions,
    newUsers,
    listens,
    uniqueListeners,
    episodes,
    activeAgg,
    statusCounts,
    utm,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "success", paidAt: { gte: from, lt: to } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.payment.count({
      where: { status: "failed", paidAt: { gte: from, lt: to } },
    }),
    prisma.subscription.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { plan: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.listenLog.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.listenLog.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.episode.count({
      where: { status: "published", publishDate: { gte: from, lt: to } },
    }),
    prisma.payment.aggregate({
      where: { status: "success" },
      _count: { _all: true },
    }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.groupBy({
      by: ["utmSource"],
      _count: { _all: true },
      where: { createdAt: { gte: from, lt: to } },
    }),
  ]);

  const planSplit = subscriptions.reduce((acc, s) => {
    acc[s.plan] = (acc[s.plan] || 0) + 1;
    return acc;
  }, {});
  const statusCountsBy = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count._all]),
  );

  return {
    revenue: paymentsAgg._sum.amount || 0,
    paymentCount: paymentsAgg._count,
    failedCount,
    planSplit,
    newSubs: subscriptions.length,
    newUsers,
    listens,
    uniqueListeners: uniqueListeners.length,
    episodes,
    allTimePayments: activeAgg._count,
    statusCounts: statusCountsBy,
    utm: utm.sort((a, b) => b._count._all - a._count._all).slice(0, 5),
  };
}

function fmtNgn(value) {
  return value.toLocaleString("en-NG", { style: "currency", currency: "NGN" });
}

function summaryRow(label, value) {
  return `<tr><td style="padding:9px 14px;border-bottom:1px solid #ece7df;color:#4a463f;">${escapeHtml(label)}</td><td style="padding:9px 14px;border-bottom:1px solid #ece7df;font-weight:600;color:#1a1a1a;text-align:right;">${escapeHtml(value)}</td></tr>`;
}

function summaryTable(title, rows) {
  const body = rows.map(([label, value]) => summaryRow(label, value)).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #ece7df;border-radius:12px;margin-bottom:22px;"><tr><td style="background:#faf6ef;border-bottom:1px solid #ece7df;padding:10px 14px;font-weight:700;color:#1a1a1a;font-size:13px;">${title}</td></tr>${body}</table>`;
}

function buildMonthlyHtml(summary, label) {
  const monthName = new Date(summary.startTime).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const statusRows = Object.entries(summary.statusCounts).length
    ? Object.entries(summary.statusCounts).map(([status, count]) => [
        status,
        count,
      ])
    : [["active", 0]];
  const planRows = Object.entries(summary.planSplit).length
    ? Object.entries(summary.planSplit).map(([plan, count]) => [plan, count])
    : [["no new plans", 0]];
  const utmRows = summary.utm.length
    ? summary.utm.map((u) => [u.utmSource || "(not set)", u._count._all])
    : [["no signups this month", 0]];

  const bodyHtml = `
<p>Here is the Money &amp; Mind monthly report for <strong>${escapeHtml(monthName)}</strong>.</p>
${summaryTable("Payments", [
  ["Successful payments", summary.paymentCount],
  ["Total revenue", fmtNgn(summary.revenue)],
  ["Failed payments", summary.failedCount],
])}
${summaryTable("Growth", [
  ["New registered users", summary.newUsers],
  ["New subscriptions", summary.newSubs],
  ["Episodes published", summary.episodes],
  ["Total listens", summary.listens],
  ["Unique listeners", summary.uniqueListeners],
])}
${summaryTable("Subscription status (today)", statusRows)}
${summaryTable("New plans", planRows)}
${summaryTable("Top acquisition sources", utmRows)}
<p style="font-size:12px;color:#8a8a8a;">All-time successful payments: ${summary.allTimePayments}. The attached CSV files contain payment, subscription, and new-user details for ${escapeHtml(label)}.</p>`;

  return emailTemplate({ title: `${label} Monthly Report`, bodyHtml });
}

async function sendMonthlyReport({ from, to, label }) {
  const [paymentsCsv, subscriptionsCsv, usersCsv, summary] = await Promise.all([
    buildPaymentsCsv({ from, to }),
    buildSubscriptionsCsv({ from, to }),
    buildUsersCsv({ from, to }),
    buildMonthlySummary({ from, to }),
  ]);
  summary.startTime = from.getTime();

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });
  const recipients = [
    ...new Set([
      RECONCILIATION_EMAIL,
      ...admins.map((u) => (u.email || "").trim()).filter(Boolean),
    ]),
  ];

  if (!brevoConfigured() || recipients.length === 0) {
    console.log(
      "[reconciliation] monthly email skipped — set BREVO_API_KEY, BREVO_FROM_EMAIL, RECONCILIATION_EMAIL or admin-role users",
    );
    return { sent: false, reason: "no recipients or brevo not configured" };
  }

  const attachment = (name, csv) => ({
    name,
    content: Buffer.from(csv, "utf-8").toString("base64"),
  });

  let anySent = false;
  for (const to of recipients) {
    if (!to) continue;
    try {
      await sendEmail({
        to,
        subject: `Monthly Money & Mind Report — ${label}`,
        htmlContent: buildMonthlyHtml(
          { ...summary, startTime: from.getTime() },
          label,
        ),
        attachments: [
          attachment(`payments-${label}.csv`, paymentsCsv.csv),
          attachment(`subscriptions-${label}.csv`, subscriptionsCsv.csv),
          attachment(`users-${label}.csv`, usersCsv.csv),
        ],
      });
      anySent = true;
    } catch (err) {
      console.error(
        `[reconciliation] monthly email to ${to} failed:`,
        err.message,
      );
    }
  }

  return { sent: anySent, recipients: recipients.length };
}

async function runMonthlyReconciliation(now = new Date()) {
  const { from, to, label } = previousMonthWindow(now);
  try {
    const result = await sendMonthlyReport({ from, to, label });
    console.log(
      `[reconciliation] monthly ${label}: revenue + ${result.recipients ?? 0} recipient(s), email ${result.sent ? "sent" : "skipped: " + result.reason}`,
    );
    return { date: label, kind: "Monthly", ...result };
  } catch (err) {
    console.error("[reconciliation] monthly job failed:", err.message);
    return { date: label, kind: "Monthly", sent: false, reason: err.message };
  }
}

// Run daily + monthly reconciliation reports
export function startReconciliationProcessor() {
  const tick = async () => {
    const now = new Date();
    const hour = now.getUTCHours();

    if (hour === RECONCILIATION_HOUR) {
      const today = now.toISOString().slice(0, 10);
      const last = await prisma.setting.findUnique({
        where: { key: "lastReconciliationDate" },
      });
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

    if (
      hour === MONTHLY_REPORT_HOUR &&
      now.getUTCDate() === MONTHLY_REPORT_DAY
    ) {
      const { label } = previousMonthWindow(now);
      const last = await prisma.setting.findUnique({
        where: { key: "lastMonthlyReport" },
      });
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
  console.log(
    `   - Reconciliation reports (daily at ${RECONCILIATION_HOUR}:00 UTC, monthly on day ${MONTHLY_REPORT_DAY} at ${MONTHLY_REPORT_HOUR}:00 UTC)`,
  );
  return timer;
}
