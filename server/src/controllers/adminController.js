// Admin handlers — dashboard stats, settings CRUD, users, episodes, subscriptions, notifications
// All routes using these handlers are protected by authenticate + requireAdmin middleware.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../config/prisma.js";
import { getUploadUrl } from "../services/audioStorageService.js";
import { signAudioUrl } from "../utils/audioAccessControl.js";
import logger from "../utils/logger.js";

// Admin-facing preview URLs use a longer TTL so the admin list/modal previews
// stay playable while working in the dashboard (subscriber playback stays at 60s).
const ADMIN_PREVIEW_TTL_SECONDS = 60 * 60;

// Default settings values used as fallback if DB has no value set
const DEFAULT_SETTINGS = {
  weeklyPrice: "100",
  monthlyPrice: "350",
  currency: "NGN",
  gracePeriodHours: "48",
  episodeReleaseTime: "06:00",
  dayLabels: JSON.stringify({
    monday: "Motivation Mondays",
    tuesday: "Tactical Tuesdays",
    wednesday: "Wellness Wednesdays",
    thursday: "Testimonial Thursdays",
    friday: "Financial Fridays",
  }),
};

// Whitelist of settings keys that can be updated via the PUT endpoint
const SETTINGS_KEYS = [
  "weeklyPrice", "monthlyPrice", "currency",
  "gracePeriodHours", "episodeReleaseTime",
  "dayLabels",
  "notificationTime", "enableInApp", "enableWhatsApp", "enableEmail",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, "../../storage/audio");
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

const DAY_KEYWORDS = {
  monday: ["monday"],
  tuesday: ["tuesday"],
  wednesday: ["wednesday"],
  thursday: ["thursday"],
  friday: ["friday"],
};

const AUDIO_EXT_RE = /\.(mp3|mpeg|wav|m4a|ogg|aac)$/i;

// GET /api/admin/settings
export async function getSettings(req, res, next) {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ ...DEFAULT_SETTINGS, ...map });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/settings
export async function updateSettings(req, res, next) {
  try {
    const updates = req.body;
    const ops = [];

    for (const key of SETTINGS_KEYS) {
      if (updates[key] !== undefined) {
        // Validate specific keys
        let value = updates[key];
        if (key === 'weeklyPrice' || key === 'gracePeriodHours') {
          const num = Number(value);
          if (isNaN(num) || !isFinite(num)) {
            return res.status(400).json({ error: `Invalid value for ${key}: must be a number` });
          }
          value = String(num);
        } else if (key === 'dayLabels') {
          let parsed;
          try {
            parsed = JSON.parse(value);
          } catch (e) {
            return res.status(400).json({ error: `Invalid value for dayLabels: must be valid JSON` });
          }
          const expectedKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return res.status(400).json({ error: `Invalid value for dayLabels: must be an object` });
          }
          for (const k of expectedKeys) {
            if (!(k in parsed) || typeof parsed[k] !== 'string') {
              return res.status(400).json({ error: `Invalid value for dayLabels: missing or non-string key: ${k}` });
            }
          }
          value = JSON.stringify(parsed);
        }
        ops.push(
          prisma.setting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          })
        );
      }
    }

    await Promise.all(ops);

    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ ...DEFAULT_SETTINGS, ...map });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/stats
export async function getStats(req, res, next) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      activeSubs,
      totalEpisodes,
      revenueThisMonth,
      revenueLastMonth,
      activeSubsLastMonth,
      cancelledThisMonth,
      totalSubsThisMonth,
      todayEpisode,
      recentSubs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.episode.count(),
      prisma.payment.aggregate({
        where: { status: "success", paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: "success",
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.subscription.count({
        where: { status: "active", startDate: { lte: lastMonthEnd } },
      }),
      prisma.subscription.count({
        where: {
          status: { in: ["cancelled", "expired"] },
          startDate: { gte: monthStart },
        },
      }),
      prisma.subscription.count({
        where: { startDate: { gte: monthStart } },
      }),
      prisma.episode.findFirst({
        where: {
          publishDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      }),
      prisma.subscription.findMany({
        orderBy: { startDate: "desc" },
        take: 30,
        select: { startDate: true },
      }),
    ]);

    const revenue = revenueThisMonth._sum.amount || 0;
    const lastRevenue = revenueLastMonth._sum.amount || 0;
    const revenueTrend =
      lastRevenue > 0 ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100) : revenue > 0 ? 100 : 0;

    const subTrend =
      activeSubsLastMonth > 0
        ? Math.round(((activeSubs - activeSubsLastMonth) / activeSubsLastMonth) * 100)
        : activeSubs > 0
        ? 100
        : 0;

    const churnRate =
      totalSubsThisMonth > 0 ? Math.round((cancelledThisMonth / Math.max(totalSubsThisMonth, 1)) * 100) : 0;

    const dailyGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const count = recentSubs.filter((s) => {
        const d = new Date(s.startDate);
        return d >= day && d < nextDay;
      }).length;
      dailyGrowth.push({
        date: day.toISOString().split("T")[0],
        count,
      });
    }

    res.json({
      totalUsers,
      activeSubscriptions: activeSubs,
      totalEpisodes,
      revenue,
      revenueTrend,
      subscriptionTrend: subTrend,
      churnRate,
      todayEpisode: todayEpisode
        ? { title: todayEpisode.title, status: todayEpisode.status }
        : null,
      subscriberGrowth: dailyGrowth,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users
export async function listUsers(req, res, next) {
  try {
    const { search, status } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (status) {
      if (status === "never_subscribed") {
        where.subscriptions = { none: {} };
      } else {
        where.subscriptions = { some: { status } };
      }
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        subscriptions: { orderBy: { startDate: "desc" }, take: 1 },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        listenLogs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      lastActive: u.listenLogs[0]?.createdAt || null,
      subscription: u.subscriptions[0] || null,
      lastPayment: u.payments[0] || null,
      episodesListened: u.listenLogs.length,
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id
export async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        subscriptions: { orderBy: { startDate: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        listenLogs: {
          orderBy: { createdAt: "desc" },
          include: { episode: { select: { id: true, title: true, dayType: true } } },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/users/:id
export async function deleteUser(req, res, next) {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(400).json({ error: "Cannot delete admin users" });

    await prisma.$transaction([
      prisma.listenLog.deleteMany({ where: { userId } }),
      prisma.payment.deleteMany({ where: { userId } }),
      prisma.subscription.deleteMany({ where: { userId } }),
      prisma.notificationRead.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/users/:id/override
export async function overrideUser(req, res, next) {
  try {
    const { action, reason } = req.body;
    const userId = parseInt(req.params.id);
    const adminId = req.user.id;

    if (action !== "cancel") {
      return res.status(400).json({ error: "Action must be 'cancel'" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const sub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { startDate: "desc" },
    });

    if (!sub) return res.status(404).json({ error: "No subscription found" });

    const now = new Date();
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "cancelled" },
    });

    await prisma.payment.create({
      data: {
        userId,
        subscriptionId: updated.id,
        amount: 0,
        status: "failed",
        reference: `manual_cancel_${Date.now()}`,
      },
    });

    res.json({
      subscription: updated,
      override: { action, reason: reason || null, adminId, timestamp: now },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/episodes
export async function createEpisode(req, res, next) {
  try {
    const { title, dayType, runTimeSeconds, showNotes, publishDate, status } = req.body;
    const audioUrl = req.file ? getUploadUrl(req.file.filename) : req.body.audioUrl;

    const publish = new Date(publishDate);

    // Idempotency guard: refuse to create a second episode for the same weekday.
    // The batch scheduler can be (and historically was) double-submitted, which
    // silently created full duplicate weeks. The DB unique index on
    // (dayType, publishDate) is the hard backstop; this gives a clean 409 here first.
    const existing = await prisma.episode.findFirst({
      where: { dayType, publishDate: publish },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ error: `An episode for ${dayType} on ${publish.toISOString().slice(0, 10)} already exists` });
    }

    const episode = await prisma.episode.create({
      data: {
        title,
        dayType,
        audioUrl,
        runTimeSeconds: parseInt(runTimeSeconds) || 0,
        showNotes: showNotes || "",
        publishDate: publish,
        status: status || "scheduled",
      },
    });
    res.status(201).json(episode);
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/episodes/:id
export async function updateEpisode(req, res, next) {
  try {
    const { title, dayType, runTimeSeconds, showNotes, publishDate, status } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (dayType !== undefined) updateData.dayType = dayType;
    if (runTimeSeconds !== undefined) updateData.runTimeSeconds = parseInt(runTimeSeconds) || 0;
    if (showNotes !== undefined) updateData.showNotes = showNotes;
    if (publishDate !== undefined) updateData.publishDate = new Date(publishDate);
    if (status !== undefined) updateData.status = status;
    if (req.file) updateData.audioUrl = getUploadUrl(req.file.filename);
    else if (req.body.audioUrl) updateData.audioUrl = req.body.audioUrl;

    const episode = await prisma.episode.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(episode);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/episodes/:id/publish
export async function publishEpisode(req, res, next) {
  try {
    const episode = await prisma.episode.update({
      where: { id: req.params.id },
      data: { status: "published" },
    });

    res.json(episode);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/episodes/:id
export async function deleteEpisode(req, res, next) {
  try {
    await prisma.listenLog.deleteMany({ where: { episodeId: req.params.id } });
    await prisma.episode.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/episodes/:id/stream — mint a fresh signed URL for admin preview
// (listings expire after an hour; this guarantees the play button always works)
export async function streamEpisode(req, res, next) {
  try {
    const episode = await prisma.episode.findUnique({ where: { id: req.params.id } });
    if (!episode) return res.status(404).json({ error: "Episode not found" });
    if (!episode.audioUrl) return res.status(404).json({ error: "No audio assigned to this episode" });
    res.json({ url: signAudioUrl(episode.audioUrl, ADMIN_PREVIEW_TTL_SECONDS) });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/episodes
export async function listEpisodes(req, res, next) {
  try {
    const episodes = await prisma.episode.findMany({
      orderBy: { publishDate: "desc" },
      include: { _count: { select: { listenLogs: true } } },
    });
    const mapped = episodes.map((e) => ({
      ...e,
      listenCount: e._count.listenLogs,
      _count: undefined,
      previewAudioUrl: e.audioUrl ? signAudioUrl(e.audioUrl, ADMIN_PREVIEW_TTL_SECONDS) : null,
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/subscriptions
export async function listSubscriptions(req, res, next) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const subs = await prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        payments: true,
      },
      orderBy: { startDate: "desc" },
    });

    const mapped = subs.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: s.user,
      plan: s.plan,
      status: s.status,
      startDate: s.startDate,
      nextRenewal: s.nextRenewal,
      amount: s.payments.find((p) => p.status === "success")?.amount || 0,
      lastPayment: s.payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null,
      allPayments: s.payments,
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/subscriptions/revenue
export async function getRevenue(req, res, next) {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: { in: ["success", "failed"] } },
      include: {
        user: { select: { fullName: true, email: true } },
        subscription: { select: { plan: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/reports/utm — conversion funnel grouped by UTM source
export async function getUtmReport(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { utmSource: { not: null } },
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        _count: {
          select: { payments: { where: { status: "success" } } },
        },
        subscriptions: { select: { status: true } },
      },
    });

    const bySource = {};
    for (const u of users) {
      const key = `${u.utmSource}|${u.utmMedium || ""}|${u.utmCampaign || ""}`;
      bySource[key] ||= {
        utmSource: u.utmSource,
        utmMedium: u.utmMedium,
        utmCampaign: u.utmCampaign,
        registered: 0,
        paid: 0,
        active: 0,
      };
      bySource[key].registered++;
      if (u._count.payments > 0) bySource[key].paid++;
      if (u.subscriptions.some((s) => s.status === "active")) bySource[key].active++;
    }

    res.json({ sources: Object.values(bySource), totalRegistered: users.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/payments/export?days=1 (or ?from=ISO&to=ISO) — CSV of successful payments
export async function exportPayments(req, res, next) {
  try {
    const { days, from, to } = req.query;
    const end = to ? new Date(to) : new Date();
    let start;
    if (from) {
      start = new Date(from);
    } else {
      start = new Date();
      start.setDate(start.getDate() - (parseInt(days, 10) || 1));
    }

    const payments = await prisma.payment.findMany({
      where: { status: "success", paidAt: { gte: start, lt: end } },
      include: {
        user: { select: { email: true, phone: true } },
        subscription: { select: { plan: true } },
      },
      orderBy: { paidAt: "asc" },
    });

    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

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

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="payments-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/subscriptions/send-reminder
export async function sendReminder(req, res, next) {
  try {
    const { paymentIds } = req.body;
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: "No payment IDs provided" });
    }

    const payments = await prisma.payment.findMany({
      where: { id: { in: paymentIds }, status: "failed" },
      include: { user: { select: { fullName: true, email: true } } },
    });

    await prisma.notification.create({
      data: {
        title: "Payment Reminder",
        body: `Reminder sent to ${payments.length} user(s) for failed payments.`,
        channels: "inapp",
        sentBy: "admin",
      },
    });

    res.json({ sent: payments.length, users: payments.map((p) => p.user.fullName) });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/notifications
export async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { sentAt: "desc" },
      take: 100,
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/notifications
export async function createNotification(req, res, next) {
  try {
    const { title, body: notifBody, channels } = req.body;
    if (!title || !notifBody) {
      return res.status(400).json({ error: "Title and body are required" });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        body: notifBody,
        channels: channels || "inapp",
        sentBy: "admin",
      },
    });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/notifications/test
export async function testNotification(req, res, next) {
  try {
    const { title, body: notifBody, channels } = req.body;
    res.json({ success: true, message: "Test notification sent", preview: { title, body: notifBody, channels } });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/notifications/:id
export async function deleteNotification(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    // NotificationRead has ON DELETE RESTRICT — clear reads before the row,
    // atomically so a partial delete can't happen.
    await prisma.$transaction([
      prisma.notificationRead.deleteMany({ where: { notificationId: id } }),
      prisma.notification.delete({ where: { id } }),
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/notifications
export async function clearNotifications(req, res, next) {
  try {
    await prisma.$transaction([
      prisma.notificationRead.deleteMany(),
      prisma.notification.deleteMany(),
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/audio-files — list available audio files grouped by day type
export async function listAudioFiles(req, res, next) {
  try {
    const grouped = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], unassigned: [] };

    const scan = (dir, urlPrefix) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir).filter((f) => AUDIO_EXT_RE.test(f));
      for (const file of files) {
        const canonical = `${urlPrefix}/${encodeURIComponent(file)}`;
        const item = { name: file, path: canonical, url: signAudioUrl(canonical, ADMIN_PREVIEW_TTL_SECONDS) };
        const lower = file.toLowerCase();
        let matched = false;
        for (const [day, keywords] of Object.entries(DAY_KEYWORDS)) {
          if (keywords.some((kw) => lower.includes(kw))) {
            grouped[day].push(item);
            matched = true;
            break;
          }
        }
        if (!matched) {
          grouped.unassigned.push(item);
        }
      }
    };

    scan(path.join(AUDIO_DIR, "Maiden"), "/audio/Maiden");
    scan(UPLOADS_DIR, "/uploads");

    res.json(grouped);
  } catch (err) {
    next(err);
  }
}