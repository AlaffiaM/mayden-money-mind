// Admin routes — dashboard stats, settings CRUD, users, episodes, subscriptions, notifications
// All routes in this file require admin authentication (middleware applied at top level)
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { upload, getUploadUrl } from "../services/audioStorage.js";

const router = Router();
const prisma = new PrismaClient();

// Apply auth + admin check to every route in this file
router.use(authenticate, requireAdmin);

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

// GET /api/admin/settings — returns all settings with defaults as fallback
router.get("/settings", async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ ...DEFAULT_SETTINGS, ...map });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings — upserts settings values from the request body
router.put("/settings", async (req, res) => {
  try {
    const updates = req.body;
    const ops = [];

    for (const key of SETTINGS_KEYS) {
      if (updates[key] !== undefined) {
        ops.push(
          prisma.setting.upsert({
            where: { key },
            update: { value: String(updates[key]) },
            create: { key, value: String(updates[key]) },
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats — dashboard stats: users, subs, revenue, churn, 30-day growth data
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all stats in parallel for performance
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

    // Calculate month-over-month revenue trend (percentage change)
    const revenue = revenueThisMonth._sum.amount || 0;
    const lastRevenue = revenueLastMonth._sum.amount || 0;
    const revenueTrend =
      lastRevenue > 0 ? Math.round(((revenue - lastRevenue) / lastRevenue) * 100) : revenue > 0 ? 100 : 0;

    // Calculate month-over-month subscription growth trend
    const subTrend =
      activeSubsLastMonth > 0
        ? Math.round(((activeSubs - activeSubsLastMonth) / activeSubsLastMonth) * 100)
        : activeSubs > 0
        ? 100
        : 0;

    // Calculate churn rate (cancelled / total new this month)
    const churnRate =
      totalSubsThisMonth > 0 ? Math.round((cancelledThisMonth / Math.max(totalSubsThisMonth, 1)) * 100) : 0;

    // Build 30-day subscriber growth data for the chart
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — list users with optional search + subscription status filter
router.get("/users", async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = {};

    // Search filter: matches against name, email, or phone
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    // Status filter: "never_subscribed" or a specific subscription status
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

    // Flatten nested data for the frontend table
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id — full user detail with all subs, payments, and listen history
router.get("/users/:id", async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — permanently delete a user and all related data
router.delete("/users/:id", async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/override — admin action to cancel a user's subscription
// Creates a manual payment record and logs the admin action reason
router.post("/users/:id/override", async (req, res) => {
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

    // Log manual payment record with admin reason for audit trail
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/episodes — create new episode (supports file upload via Multer)
router.post("/episodes", upload.single("audio"), async (req, res) => {
  try {
    const { title, dayType, runTimeSeconds, showNotes, publishDate, status } = req.body;
    const audioUrl = req.file ? getUploadUrl(req.file.filename) : req.body.audioUrl;
    const episode = await prisma.episode.create({
      data: {
        title,
        dayType,
        audioUrl,
        runTimeSeconds: parseInt(runTimeSeconds) || 0,
        showNotes: showNotes || "",
        publishDate: new Date(publishDate),
        status: status || "scheduled",
      },
    });
    res.status(201).json(episode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/episodes/:id — update existing episode (audio file upload optional)
router.put("/episodes/:id", upload.single("audio"), async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/episodes/:id/publish — set episode to "published" + notify active subscribers
router.post("/episodes/:id/publish", async (req, res) => {
  try {
    const episode = await prisma.episode.update({
      where: { id: req.params.id },
      data: { status: "published" },
    });

    // Notify all users with an active subscription about the new episode
    const activeUsers = await prisma.user.findMany({
      where: { subscriptions: { some: { status: "active" } } },
      select: { id: true },
    });

    await prisma.notification.create({
      data: {
        title: `New Episode: ${episode.title}`,
        body: `Today's ${episode.dayType} episode is now available. Tap to listen.`,
        channels: "inapp",
        sentBy: "system",
      },
    });

    res.json(episode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/episodes/:id — remove episode and its listen logs
router.delete("/episodes/:id", async (req, res) => {
  try {
    await prisma.listenLog.deleteMany({ where: { episodeId: req.params.id } });
    await prisma.episode.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/episodes — list all episodes with listen counts
router.get("/episodes", async (req, res) => {
  try {
    const episodes = await prisma.episode.findMany({
      orderBy: { publishDate: "desc" },
      include: { _count: { select: { listenLogs: true } } },
    });
    const mapped = episodes.map((e) => ({
      ...e,
      listenCount: e._count.listenLogs,
      _count: undefined,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/subscriptions — list all subscriptions with user and payment info
router.get("/subscriptions", async (req, res) => {
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

    // Flatten subscription data: attach latest payment + total successful amount
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/subscriptions/revenue — all payments (success + failed) for the revenue table
router.get("/subscriptions/revenue", async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/subscriptions/send-reminder — send payment reminder notifications for failed payments
router.post("/subscriptions/send-reminder", async (req, res) => {
  try {
    const { paymentIds } = req.body;
    if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
      return res.status(400).json({ error: "No payment IDs provided" });
    }

    const payments = await prisma.payment.findMany({
      where: { id: { in: paymentIds }, status: "failed" },
      include: { user: { select: { fullName: true, email: true } } },
    });

    // Create a single notification logging the reminder action
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/notifications — list recent notifications (max 100)
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { sentAt: "desc" },
      take: 100,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/notifications — create and send a new notification
router.post("/notifications", async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/notifications/test — preview a test notification without saving it
router.post("/notifications/test", async (req, res) => {
  try {
    const { title, body: notifBody, channels } = req.body;
    res.json({ success: true, message: "Test notification sent", preview: { title, body: notifBody, channels } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/notifications/:id — delete a single notification by ID
router.delete("/notifications/:id", async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/notifications — delete all notification history
router.delete("/notifications", async (req, res) => {
  try {
    await prisma.notification.deleteMany();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audio-files — list available audio files grouped by day type
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, "../../../client/public/audio/Maiden");

const DAY_KEYWORDS = {
  monday: ["monday"],
  tuesday: ["tuesday"],
  wednesday: ["wednesday"],
  thursday: ["thursday"],
  friday: ["friday"],
};

router.get("/audio-files", async (req, res) => {
  try {
    if (!fs.existsSync(AUDIO_DIR)) {
      return res.json({ monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], unassigned: [] });
    }
    const files = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3") || f.endsWith(".mpeg") || f.endsWith(".wav"));
    const grouped = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], unassigned: [] };

    for (const file of files) {
      const lower = file.toLowerCase();
      let matched = false;
      for (const [day, keywords] of Object.entries(DAY_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          grouped[day].push({ name: file, url: `/audio/Maiden/${encodeURIComponent(file)}` });
          matched = true;
          break;
        }
      }
      if (!matched) {
        grouped.unassigned.push({ name: file, url: `/audio/Maiden/${encodeURIComponent(file)}` });
      }
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
