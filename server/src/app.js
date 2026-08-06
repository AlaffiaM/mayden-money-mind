// Express app setup — middleware, route mounting, public endpoints, and renewal cron
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
import { authenticate } from "./middleware/auth.js";

const app = express();

// Behind Render's proxy — trust the single hop so rate limiting keys off the
// real client IP (req.ip), not the load balancer's.
app.set("trust proxy", 1);

// CORS — only allow the configured frontend origins (dev default: localhost:5173)
const allowedOrigins = (process.env.CLIENT_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin / non-browser (curl, mobile SDK) requests
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);

// Security headers
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Request logging
app.use(morgan("dev"));

// JSON body parsing — captures the raw body so the Paystack webhook can verify
// its HMAC signature against the exact bytes sent by Paystack.
app.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Rate limiting
// Strict: brute-force protection on auth (login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many attempts. Please try again later." },
});

// Looser: protects admin endpoints against abuse while not breaking legitimate use
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: { error: "Too many requests. Please slow down." },
});

// API route mounting
app.use("/api/auth", authLimiter, authRoutes);           // Register + login
app.use("/api/episodes", episodeRoutes);    // Public episode listing + listen logging
app.use("/api/subscriptions", subscriptionRoutes); // User subscription management
app.use("/api/payments", paymentRoutes);    // Paystack payment init, verify, webhook
app.use("/api/audio", audioRoutes);         // Signed, access-controlled audio streaming
app.use("/api/admin", adminLimiter, adminRoutes);         // Admin-only CRUD + stats + notifications

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Public pricing endpoint — used by the landing page and subscription page
const DEFAULT_PRICING = { weeklyPrice: "100", monthlyPrice: "350", currency: "NGN" };

app.get("/api/settings/pricing", async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ ...DEFAULT_PRICING, ...map });
  } catch (err) {
    next(err);
  }
});

// Authenticated endpoint for users to fetch their in-app notifications with read status
app.get("/api/notifications/latest", authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { sentAt: "desc" },
      take: 20,
      include: { reads: { where: { userId: req.user.id }, select: { id: true } },
      },
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

// Mark a notification as read for the current user
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

// 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Final error handler — never leak internal error messages to clients
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status >= 500 ? "Internal server error" : "Bad request",
  });
});

// Start the grace period / failed renewal processor (runs every 12h)
startRenewalProcessor();

// Start auto-publish — checks every 15min for episodes ready to go live
startAutoPublisher();

export default app;
