import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { prisma } from "./config/prisma.js";
import authRoutes from "./routes/auth.js";
import episodeRoutes from "./routes/episodes.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import paymentRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import audioRoutes from "./routes/audio.js";
import { startRenewalProcessor } from "./services/renewalService.js";
import { startAutoPublisher } from "./services/autoPublishService.js";
import { startDailyReminderProcessor } from "./services/dailyReminderService.js";
import { startReconciliationProcessor } from "./services/reconciliationService.js";
import { startSubscribeReminderProcessor } from "./services/subscribeReminderService.js";
import { authenticate } from "./middleware/auth.js";
import logger from "./utils/logger.js";

const app = express();

app.set("trust proxy", 1);

const defaultOrigins = ["http://localhost:5173", "https://mayden-money-mind.vercel.app", "https://moneyandmind.alaffiaradio.com"];
const envOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...defaultOrigins, ...envOrigins];

app.use(
  cors({
    origin(origin, callback) {

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(morgan("dev"));

app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many attempts. Please try again later." },
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many requests. Please slow down." },
});

const subscriptionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many requests. Please slow down." },
});

const audioLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many requests. Please slow down." },
});

const episodesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many requests. Please slow down." },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/episodes", episodesLimiter, episodeRoutes);
app.use("/api/subscriptions", subscriptionLimiter, subscriptionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/audio", audioLimiter, audioRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/debug/emailVerified", async (req, res) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'emailVerified'
    `;
    res.json({ exists: result.length > 0, column: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const DEFAULT_PRICING = { weeklyPrice: "100", monthlyPrice: "350", currency: "NGN" };
const PRICING_KEYS = ["weeklyPrice", "monthlyPrice", "currency"];

// Public pricing settings
app.get("/api/settings/pricing", async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ where: { key: { in: PRICING_KEYS } } });
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ ...DEFAULT_PRICING, ...map });
  } catch (err) {
    next(err);
  }
});

// Latest notifications for the user
app.get("/api/notifications/latest", authenticate, async (req, res, next) => {
  try {
    const hasActiveSub = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
      select: { id: true },
    });

    const notifications = await prisma.notification.findMany({
      where: hasActiveSub ? undefined : { subscribersOnly: false },
      orderBy: { sentAt: "desc" },
      take: 20,
      include: { reads: { where: { userId: req.user.id }, select: { id: true } } },
    });
    const mapped = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      channels: n.channels,
      sentBy: n.sentBy,
      sentAt: n.sentAt,
      read: n.reads.length > 0,
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
});

// Mark notification as read
app.post("/api/notifications/:id/read", authenticate, async (req, res, next) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: "Invalid notification id" });
    }
    const userId = req.user.id;
    await prisma.notificationRead.upsert({
      where: { userId_notificationId: { userId, notificationId } },
      update: {},
      create: { userId, notificationId },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Catch-all 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err.stack || err);
  if (res.headersSent) return next(err);
  const status = err.code === "P2025" ? 404 : err.status || err.statusCode || 500;
  res.status(status).json({
    error: status >= 500 ? "Internal server error" : err.message || "Bad request",
  });
});

startRenewalProcessor();

startAutoPublisher();

startReconciliationProcessor();

startDailyReminderProcessor();

startSubscribeReminderProcessor();

export default app;
