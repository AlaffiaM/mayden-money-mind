// Express app setup — middleware, route mounting, public endpoints, and renewal cron
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.js";
import episodeRoutes from "./routes/episodes.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import paymentRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";
import { startRenewalProcessor } from "./services/renewal.js";
import { startAutoPublisher } from "./services/autoPublish.js";
import { authenticate } from "./middleware/auth.js";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Security, CORS, logging, body parsing, static file serving
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/audio", express.static(path.join(__dirname, "../../../client/public/audio")));

// API route mounting
app.use("/api/auth", authRoutes);           // Register + login
app.use("/api/episodes", episodeRoutes);    // Public episode listing + listen logging
app.use("/api/subscriptions", subscriptionRoutes); // User subscription management
app.use("/api/payments", paymentRoutes);    // Paystack payment init, verify, webhook
app.use("/api/admin", adminRoutes);         // Admin-only CRUD + stats + notifications

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Public pricing endpoint — used by the landing page and subscription page
const DEFAULT_PRICING = { weeklyPrice: "100", monthlyPrice: "350", currency: "NGN" };

app.get("/api/settings/pricing", async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const map = {};
    for (const s of settings) map[s.key] = s.value;
    res.json({ ...DEFAULT_PRICING, ...map });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated endpoint for users to fetch their in-app notifications with read status
app.get("/api/notifications/latest", authenticate, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

// Mark a notification as read for the current user
app.post("/api/notifications/:id/read", authenticate, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;
    await prisma.notificationRead.upsert({
      where: { userId_notificationId: { userId, notificationId } },
      update: {},
      create: { userId, notificationId },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the grace period / failed renewal processor (runs every 12h)
startRenewalProcessor();

// Start auto-publish — checks every 15min for episodes ready to go live
startAutoPublisher();

export default app;
