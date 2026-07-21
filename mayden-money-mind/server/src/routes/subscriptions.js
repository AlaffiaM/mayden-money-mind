// Subscription routes — user-facing subscription management (create, pause, cancel, check status)
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

// GET /api/subscriptions/mine — returns the user's subscription (prefers active over latest)
router.get("/mine", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: "User not found" });

    // Prefer returning an active subscription over the most recent one
    const active = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });

    if (active) return res.json(active);

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });

    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscriptions/mine/status — lightweight status check for route guards
router.get("/mine/status", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: "User not found" });

    // Prefer active subscription
    const active = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
      select: { id: true, status: true, plan: true },
    });

    if (active) return res.json({ status: active.status, subscriptionId: active.id });

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, plan: true },
    });

    res.json({ status: sub?.status || "none", subscriptionId: sub?.id || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions — create a new subscription (plan: "weekly" or "monthly")
// Returns existing pending sub if one already exists, prevents duplicate active subs
router.post("/", authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["weekly", "monthly"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ error: "User not found. Please log in again." });
    }

    // Block if user already has an active subscription
    const existingActive = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
    });
    if (existingActive) {
      return res.status(400).json({ error: "Already have an active subscription" });
    }

    // Return existing pending subscription instead of creating a duplicate
    const existingPending = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "pending" },
    });
    if (existingPending) {
      return res.status(200).json(existingPending);
    }

    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + (plan === "weekly" ? 7 : 30));

    const sub = await prisma.subscription.create({
      data: {
        userId: req.user.id,
        plan,
        status: "pending",
        nextRenewal,
      },
    });

    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/subscriptions/:id — pause, resume, or cancel a subscription (ownership enforced)
// Pausing freezes the renewal timer; resuming restores the remaining time
router.patch("/:id", authenticate, async (req, res) => {
  try {
    const { status, plan } = req.body;
    const allowed = ["paused", "active", "cancelled"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status change" });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    if (sub.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const updateData = { ...(plan && { plan }) };

    if (status === "paused" && sub.status === "active") {
      // Pause: freeze the renewal timer by saving when we paused
      updateData.status = "paused";
      updateData.pausedAt = new Date();
      // Set nextRenewal far in the future so grace period processor won't cancel it
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      updateData.nextRenewal = farFuture;
    } else if (status === "active" && sub.status === "paused") {
      // Resume: restore remaining time based on how long they were paused
      if (sub.pausedAt) {
        const pausedDuration = Date.now() - new Date(sub.pausedAt).getTime();
        const planDays = sub.plan === "weekly" ? 7 : 30;
        const planMs = planDays * 24 * 60 * 60 * 1000;
        const remainingMs = Math.max(planMs - pausedDuration, 0);
        const newRenewal = new Date();
        newRenewal.setTime(newRenewal.getTime() + remainingMs);
        updateData.nextRenewal = newRenewal;
      }
      updateData.status = "active";
      updateData.pausedAt = null;
    } else {
      // Cancel or other changes
      if (status) updateData.status = status;
    }

    const updated = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
