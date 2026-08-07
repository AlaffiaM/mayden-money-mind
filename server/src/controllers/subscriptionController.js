// Subscription handlers — user-facing subscription management (create, pause, cancel, check status)
import { prisma } from "../config/prisma.js";
import { disablePaystackSubscription } from "../services/paymentService.js";

// Allowed user-initiated status transitions for a subscription.
// "pending → active" is NOT allowed here — it may only happen through a verified payment
// (see payments). Plan changes are also blocked: upgrading/downgrading requires a
// fresh subscription + payment.
const ALLOWED_TRANSITIONS = {
  pending: [],
  active: ["paused", "cancelled"],
  paused: ["active", "cancelled"],
  past_due: ["cancelled"],
  cancelled: [],
  expired: [],
};

// GET /api/subscriptions/mine
export async function getMine(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const active = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });

    if (active) return res.json(active);

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      orderBy: { startDate: "desc" },
      include: { payments: { orderBy: { createdAt: "desc" }, take: 5 } },
    });

    res.json(sub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/subscriptions/mine/status
export async function getStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ error: "User not found" });

    const active = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
      select: { id: true, status: true, plan: true },
    });

    if (active) return res.json({ status: active.status, subscriptionId: active.id });

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.user.id },
      orderBy: { startDate: "desc" },
      select: { id: true, status: true, plan: true },
    });

    res.json({ status: sub?.status || "none", subscriptionId: sub?.id || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/subscriptions
export async function create(req, res) {
  try {
    const { plan } = req.body;
    if (!["weekly", "monthly"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ error: "User not found. Please log in again." });
    }

    const existingActive = await prisma.subscription.findFirst({
      where: { userId: req.user.id, status: "active" },
    });
    if (existingActive) {
      return res.status(400).json({ error: "Already have an active subscription" });
    }

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
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /api/subscriptions/:id — pause, resume, or cancel (ownership enforced)
export async function update(req, res) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    if (sub.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const allowed = ALLOWED_TRANSITIONS[sub.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid subscription status change" });
    }

    const updateData = { status };

    if (status === "paused") {
      updateData.pausedAt = new Date();
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      updateData.nextRenewal = farFuture;
    } else if (status === "active") {
      if (sub.pausedAt) {
        const pausedDuration = Date.now() - new Date(sub.pausedAt).getTime();
        const planDays = sub.plan === "weekly" ? 7 : 30;
        const planMs = planDays * 24 * 60 * 60 * 1000;
        const remainingMs = Math.max(planMs - pausedDuration, 0);
        const newRenewal = new Date();
        newRenewal.setTime(newRenewal.getTime() + remainingMs);
        updateData.nextRenewal = newRenewal;
      }
      updateData.pausedAt = null;
    } else if (status === "cancelled") {
      // Stop future recurring charges at Paystack, then cancel locally
      if (sub.paystackSubscriptionCode) {
        try {
          await disablePaystackSubscription(sub.paystackSubscriptionCode);
        } catch (err) {
          console.error("[cancel] failed to disable Paystack subscription:", err.message);
        }
      }
      updateData.autoRenew = false;
    }

    const updated = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /api/subscriptions/:id/auto-renew — turn automatic card renewal on/off.
// Turning OFF stops future Paystack charges but keeps access until the current
// paid period (nextRenewal) ends. Turning ON re-enables the flag; the client
// routes the user through a 1-tap re-checkout with their saved card.
export async function setAutoRenew(req, res) {
  try {
    const { autoRenew } = req.body;

    const sub = await prisma.subscription.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    if (sub.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    if (typeof autoRenew !== "boolean") {
      return res.status(400).json({ error: "autoRenew must be a boolean" });
    }

    if (autoRenew === false && sub.autoRenew && sub.paystackSubscriptionCode) {
      try {
        await disablePaystackSubscription(sub.paystackSubscriptionCode);
      } catch (err) {
        console.error("[auto-renew] failed to disable Paystack subscription:", err.message);
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: { autoRenew },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
