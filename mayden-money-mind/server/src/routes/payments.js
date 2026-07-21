// Payment routes — Paystack payment initialization, verification, callback, and webhook
// Handles the full payment lifecycle: init → redirect → callback/webhook → activate subscription
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { initializePayment, verifyPayment } from "../services/payment.js";

const router = Router();
const prisma = new PrismaClient();

// POST /api/payments/initialize — creates a Paystack transaction for a subscription
// Returns payment record + redirect URL for user to complete checkout
router.post("/initialize", authenticate, async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    if (sub.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    // Read price from DB settings (falls back to defaults)
    const priceSettings = await prisma.setting.findMany({
      where: { key: { in: ["weeklyPrice", "monthlyPrice"] } },
    });
    const priceMap = {};
    for (const s of priceSettings) priceMap[s.key] = s.value;

    const amount = sub.plan === "weekly" ? parseInt(priceMap.weeklyPrice || "100") : parseInt(priceMap.monthlyPrice || "350");
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { reference, redirectUrl } = await initializePayment(user, subscriptionId, amount);

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        subscriptionId,
        amount,
        reference,
        status: "pending",
      },
    });

    res.json({ payment, redirectUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/verify — manually verify a payment after redirect (client-side poll fallback)
router.post("/verify", authenticate, async (req, res) => {
  try {
    const { reference } = req.body;
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const success = await verifyPayment(reference);

    if (success) {
      await prisma.payment.update({
        where: { reference },
        data: { status: "success", paidAt: new Date() },
      });

      const sub = await prisma.subscription.findUnique({
        where: { id: payment.subscriptionId },
      });
      const nextRenewal = new Date();
      nextRenewal.setDate(nextRenewal.getDate() + (sub?.plan === "weekly" ? 7 : 30));

      // Activate subscription and set next renewal date
      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: "active", nextRenewal },
      });
    }

    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/callback — Paystack redirect callback after user completes checkout
// Verifies payment and redirects user to /subscription?status=success|failed
router.get("/callback", async (req, res) => {
  const { reference } = req.query;
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!reference) {
    return res.redirect(`${baseUrl}/subscription?status=failed`);
  }

  try {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) {
      return res.redirect(`${baseUrl}/subscription?status=failed`);
    }

    const success = await verifyPayment(reference);

    if (success) {
      await prisma.payment.update({
        where: { reference },
        data: { status: "success", paidAt: new Date() },
      });

      const sub = await prisma.subscription.findUnique({
        where: { id: payment.subscriptionId },
      });
      const nextRenewal = new Date();
      nextRenewal.setDate(nextRenewal.getDate() + (sub?.plan === "weekly" ? 7 : 30));

      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: "active", nextRenewal },
      });

      return res.redirect(`${baseUrl}/dashboard?status=success`);
    }

    res.redirect(`${baseUrl}/subscription?status=failed`);
  } catch {
    res.redirect(`${baseUrl}/subscription?status=failed`);
  }
});

// POST /api/payments/webhook — Paystack server-to-server webhook
// Handles: charge.success (activate), charge.failed (past_due), subscription.disable (cancel)
router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;
    const reference = event.data?.reference;

    if (!reference) return res.sendStatus(200);

    // Payment succeeded — activate subscription
    if (event.event === "charge.success") {
      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (payment && payment.status !== "success") {
        await prisma.payment.update({
          where: { reference },
          data: { status: "success", paidAt: new Date() },
        });

        const sub = await prisma.subscription.findUnique({
          where: { id: payment.subscriptionId },
        });
        const nextRenewal = new Date();
        nextRenewal.setDate(nextRenewal.getDate() + (sub?.plan === "weekly" ? 7 : 30));

        await prisma.subscription.update({
          where: { id: payment.subscriptionId },
          data: { status: "active", nextRenewal },
        });
      }
    }

    // Payment failed — move to past_due (grace period starts)
    if (event.event === "charge.failed") {
      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (payment) {
        await prisma.payment.update({
          where: { reference },
          data: { status: "failed" },
        });

        const sub = await prisma.subscription.findUnique({
          where: { id: payment.subscriptionId },
        });

        if (sub && sub.status === "active") {
          const graceSettings = await prisma.setting.findUnique({ where: { key: "gracePeriodHours" } });
          const graceHours = parseInt(graceSettings?.value || "48");
          const pastDueDate = new Date();
          pastDueDate.setHours(pastDueDate.getHours() + graceHours);

          await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: { status: "past_due", nextRenewal: pastDueDate },
          });
        }
      }
    }

    // Paystack subscription disabled — cancel subscription
    if (event.event === "subscription.disable") {
      const { subscription_code } = event.data || {};
      if (subscription_code) {
        const payment = await prisma.payment.findFirst({
          where: { reference: { contains: subscription_code } },
          orderBy: { createdAt: "desc" },
        });
        if (payment) {
          await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: { status: "cancelled" },
          });
        }
      }
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(200);
  }
});

export default router;
