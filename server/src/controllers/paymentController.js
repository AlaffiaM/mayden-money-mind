// Payment handlers — Paystack initialization, verification, callback, and webhook
// Handles the full payment lifecycle: init → redirect → callback/webhook → activate subscription
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { initializePayment, verifyPayment } from "../services/paymentService.js";
import { getPaystackKey } from "../config/paystack.js";

// Activates a subscription and sets its next renewal date after a successful payment
async function activateSubscription(subscriptionId) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  const nextRenewal = new Date();
  nextRenewal.setDate(nextRenewal.getDate() + (sub?.plan === "weekly" ? 7 : 30));

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "active", nextRenewal },
  });
}

// POST /api/payments/initialize
export async function initialize(req, res) {
  try {
    const { subscriptionId } = req.body;

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    if (sub.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

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
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// POST /api/payments/verify
export async function verify(req, res) {
  try {
    const { reference } = req.body;
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    if (payment.userId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    const success = await verifyPayment(reference);

    if (success) {
      await prisma.payment.update({
        where: { reference },
        data: { status: "success", paidAt: new Date() },
      });

      await activateSubscription(payment.subscriptionId);
    }

    res.json({ success });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/payments/callback
export async function callback(req, res) {
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

      await activateSubscription(payment.subscriptionId);

      return res.redirect(`${baseUrl}/dashboard?status=success`);
    }

    res.redirect(`${baseUrl}/subscription?status=failed`);
  } catch {
    res.redirect(`${baseUrl}/subscription?status=failed`);
  }
}

// POST /api/payments/webhook — Paystack server-to-server webhook
export async function webhook(req, res) {
  try {
    const secret = await getPaystackKey();
    if (!secret) {
      return res.status(401).json({ error: "Webhook not configured" });
    }

    const provided = req.headers["x-paystack-signature"];
    const rawBody = req.rawBody;
    if (!provided || !rawBody) {
      return res.status(401).json({ error: "Missing signature" });
    }

    const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = req.body;
    const reference = event.data?.reference;

    if (!reference) return res.sendStatus(200);

    // Payment succeeded — activate subscription
    if (event.event === "charge.success") {
      const payment = await prisma.payment.findUnique({ where: { reference } });
      if (payment && payment.status !== "success") {
        if (event.data.amount && payment.amount * 100 !== event.data.amount) {
          return res.sendStatus(200);
        }

        await prisma.payment.update({
          where: { reference },
          data: { status: "success", paidAt: new Date() },
        });

        await activateSubscription(payment.subscriptionId);
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
    res.status(401).json({ error: "Invalid webhook" });
  }
}
