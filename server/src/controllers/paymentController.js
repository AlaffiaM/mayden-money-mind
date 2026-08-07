// Payment handlers — Paystack initialization, verification, callback, and webhook
// Handles the full payment lifecycle: init → redirect → callback/webhook → activate subscription,
// plus recurring-billing events (subscription.create, invoice.update, subscription.disable)
import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  initializePayment,
  verifyPayment,
  disablePaystackSubscription,
} from "../services/paymentService.js";
import { getPaystackKey } from "../config/paystack.js";

// Activates a subscription and sets its next renewal date after a successful payment.
// Extras (planCode/subscriptionCode) come from the Paystack verify/webhook payload and
// link this subscription to the recurring Paystack billing that keeps renewing it.
async function activateSubscription(subscriptionId, extras = {}) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });
  const nextRenewal = new Date();
  nextRenewal.setDate(nextRenewal.getDate() + (sub?.plan === "weekly" ? 7 : 30));

  const data = {
    status: "active",
    autoRenew: true,
    nextRenewal,
  };
  if (extras.planCode) data.paystackPlanCode = extras.planCode;
  if (extras.subscriptionCode) data.paystackSubscriptionCode = extras.subscriptionCode;

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data,
  });
}

// Moves an active subscription to past_due and starts the configurable grace window.
async function markPastDue(subscriptionId) {
  const graceSettings = await prisma.setting.findUnique({ where: { key: "gracePeriodHours" } });
  const graceHours = parseInt(graceSettings?.value || "48");
  const pastDueDate = new Date();
  pastDueDate.setHours(pastDueDate.getHours() + graceHours);

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: "past_due", nextRenewal: pastDueDate },
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
    const { reference, redirectUrl, planCode } = await initializePayment(user, subscriptionId, amount, sub.plan);

    // Remember which Paystack plan this subscription belongs to (recurring billing)
    if (planCode && sub.paystackPlanCode !== planCode) {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { paystackPlanCode: planCode },
      });
    }

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

    const data = await verifyPayment(reference);

    if (data) {
      await prisma.payment.update({
        where: { reference },
        data: {
          status: "success",
          paidAt: new Date(),
          ...(data.authorization?.last4 ? { last4: data.authorization.last4 } : {}),
        },
      });

      await activateSubscription(payment.subscriptionId, {
        planCode: data.plan?.plan_code,
        subscriptionCode: data.subscription_code,
      });
    }

    res.json({ success: !!data });
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

    const data = await verifyPayment(reference);

    if (data) {
      await prisma.payment.update({
        where: { reference },
        data: {
          status: "success",
          paidAt: new Date(),
          ...(data.authorization?.last4 ? { last4: data.authorization.last4 } : {}),
        },
      });

      await activateSubscription(payment.subscriptionId, {
        planCode: data.plan?.plan_code,
        subscriptionCode: data.subscription_code,
      });

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

    // charge.success — first payment OR a recurring renewal charge
    if (event.event === "charge.success") {
      let payment = reference ? await prisma.payment.findUnique({ where: { reference } }) : null;

      // Recurring renewal — the reference is new to us; find the subscription via
      // the Paystack subscription_code and record the renewal payment.
      if (!payment && event.data?.subscription_code) {
        const sub = await prisma.subscription.findFirst({
          where: { paystackSubscriptionCode: event.data.subscription_code },
        });
        if (sub) {
          payment = await prisma.payment.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              amount: (event.data.amount || 0) / 100,
              reference: reference || `renewal-${Date.now()}`,
              status: "success",
              paidAt: new Date(),
              ...(event.data.authorization?.last4 ? { last4: event.data.authorization.last4 } : {}),
            },
          });
        }
      }

      if (payment && payment.status !== "success") {
        if (event.data.amount && payment.amount * 100 !== event.data.amount) {
          return res.sendStatus(200);
        }

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            paidAt: new Date(),
            ...(event.data.authorization?.last4 ? { last4: event.data.authorization.last4 } : {}),
          },
        });

        await activateSubscription(payment.subscriptionId, {
          planCode: event.data.plan?.plan_code,
          subscriptionCode: event.data.subscription_code,
        });
      }
      return res.sendStatus(200);
    }

    // Payment failed — move to past_due (grace period starts)
    if (event.event === "charge.failed") {
      if (reference) {
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
            await markPastDue(payment.subscriptionId);
          }
        }
      }
      return res.sendStatus(200);
    }

    // invoice.update — fired on every recurring renewal attempt
    if (event.event === "invoice.update") {
      const invoice = event.data;
      const subscriptionCode = invoice.subscription?.subscription_code;
      if (!subscriptionCode) return res.sendStatus(200);

      const sub = await prisma.subscription.findFirst({
        where: { paystackSubscriptionCode: subscriptionCode },
      });
      if (!sub) return res.sendStatus(200);

      const invoiceReference = invoice.transaction?.reference || `invoice-${invoice.id || Date.now()}`;
      const amount = (invoice.amount || 0) / 100;

      if (invoice.status === "success") {
        const existing = await prisma.payment.findUnique({ where: { reference: invoiceReference } });
        if (!existing) {
          await prisma.payment.create({
            data: {
              userId: sub.userId,
              subscriptionId: sub.id,
              amount,
              reference: invoiceReference,
              status: "success",
              paidAt: invoice.paid_at ? new Date(invoice.paid_at) : new Date(),
              ...(invoice.authorization?.last4 ? { last4: invoice.authorization.last4 } : {}),
            },
          });
        }
        await activateSubscription(sub.id, {
          planCode: invoice.subscription?.plan?.plan_code,
          subscriptionCode,
        });
      } else if (invoice.status === "failed") {
        await prisma.payment.upsert({
          where: { reference: invoiceReference },
          update: { status: "failed" },
          create: {
            userId: sub.userId,
            subscriptionId: sub.id,
            amount,
            reference: invoiceReference,
            status: "failed",
          },
        });

        if (sub.status === "active") {
          await markPastDue(sub.id);
        }
      }
      return res.sendStatus(200);
    }

    // subscription.create — Paystack created a recurring subscription after first payment.
    // Link it to the user's subscription (backup to the info captured during verify).
    if (event.event === "subscription.create") {
      const subscriptionCode = event.data?.subscription_code;
      const planCode = event.data?.plan?.plan_code;
      const email = event.data?.customer?.email;

      if (subscriptionCode && email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.subscription.updateMany({
            where: { userId: user.id, status: "pending" },
            data: {
              paystackSubscriptionCode: subscriptionCode,
              ...(planCode ? { paystackPlanCode: planCode } : {}),
              autoRenew: true,
            },
          });
        }
      }
      return res.sendStatus(200);
    }

    // subscription.disable — Paystack disabled the recurring subscription (payment
    // failures exhausted retries, or the customer/card was invalidated). Cancel locally.
    if (event.event === "subscription.disable") {
      const { subscription_code: subscriptionCode } = event.data || {};
      if (subscriptionCode) {
        await prisma.subscription.updateMany({
          where: { paystackSubscriptionCode: subscriptionCode },
          data: { status: "cancelled", autoRenew: false },
        });
      }
      return res.sendStatus(200);
    }

    // subscription.not_renew — customer declined renewal at Paystack
    if (event.event === "subscription.not_renew") {
      const { subscription_code: subscriptionCode } = event.data || {};
      if (subscriptionCode) {
        await prisma.subscription.updateMany({
          where: { paystackSubscriptionCode: subscriptionCode },
          data: { autoRenew: false },
        });
      }
      return res.sendStatus(200);
    }

    res.sendStatus(200);
  } catch {
    res.status(401).json({ error: "Invalid webhook" });
  }
}
