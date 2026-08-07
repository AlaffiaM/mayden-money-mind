import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import request from "supertest";
import { app, prisma, createUser, createSubscription, createPayment, login } from "./helpers.js";

describe("Payments (F2 + F3)", () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  before(async () => {
    userA = await createUser({ email: "paya@test.com", password: "PayPass123!" });
    userB = await createUser({ email: "payb@test.com", password: "PayPass123!" });
    tokenA = await login("paya@test.com", "PayPass123!");
    tokenB = await login("payb@test.com", "PayPass123!");
  });

  it("rejects verifying another user's payment reference", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "pending" });
    const payment = await createPayment({ userId: userA.id, subscriptionId: sub.id, reference: "REF-OWNER-CHECK" });
    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ reference: payment.reference });
    assert.equal(res.status, 403);
  });

  it("allows a user to verify their own payment (dev mode)", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "pending" });
    const payment = await createPayment({ userId: userA.id, subscriptionId: sub.id });
    const res = await request(app)
      .post("/api/payments/verify")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reference: payment.reference });
    assert.equal(res.status, 200);
  });

  describe("webhook signature verification", () => {
    beforeEach(() => {
      process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook_abc123";
    });
    after(() => {
      delete process.env.PAYSTACK_SECRET_KEY;
    });

    function signedWebhook(event, payload) {
      const rawBody = JSON.stringify({ event, data: payload });
      const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
      return { rawBody, sig };
    }

    async function makePendingPayment() {
      const sub = await createSubscription({ userId: userA.id, status: "pending" });
      const payment = await createPayment({ userId: userA.id, subscriptionId: sub.id, amount: 100, reference: `REF-WEB-${Date.now()}` });
      return { sub, payment };
    }

    it("rejects webhooks with no signature", async () => {
      const { payment } = await makePendingPayment();
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ event: "charge.success", data: { reference: payment.reference, amount: 10000 } }));
      assert.equal(res.status, 401);
    });

    it("rejects webhooks with a forged/invalid signature", async () => {
      const { payment } = await makePendingPayment();
      const rawBody = JSON.stringify({ event: "charge.success", data: { reference: payment.reference, amount: 10000 } });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", "deadbeef".repeat(16))
        .send(rawBody);
      assert.equal(res.status, 401);
    });

    it("activates a subscription on a valid charge.success webhook", async () => {
      const { sub, payment } = await makePendingPayment();
      const { rawBody, sig } = signedWebhook("charge.success", { reference: payment.reference, amount: 10000 });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "active");
    });

    it("ignores valid webhooks whose amount does not match the subscription price", async () => {
      const { sub, payment } = await makePendingPayment();
      const { rawBody, sig } = signedWebhook("charge.success", { reference: payment.reference, amount: 1 });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "pending");
    });
  });

  describe("recurring billing webhooks", () => {
    beforeEach(() => {
      process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook_abc123";
    });
    after(() => {
      delete process.env.PAYSTACK_SECRET_KEY;
    });

    function signedWebhook(event, payload) {
      const rawBody = JSON.stringify({ event, data: payload });
      const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
      return { rawBody, sig };
    }

    it("subscription.create links the Paystack code to a user's pending subscription", async () => {
      const user = await createUser({ email: "recurcreate@test.com", password: "PayPass123!" });
      const sub = await createSubscription({ userId: user.id, status: "pending" });
      const { rawBody, sig } = signedWebhook("subscription.create", {
        subscription_code: "SUB_CREATE_123",
        plan: { plan_code: "PLN_weekly" },
        customer: { email: "recurcreate@test.com" },
      });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.paystackSubscriptionCode, "SUB_CREATE_123");
      assert.equal(updated.paystackPlanCode, "PLN_weekly");
      assert.equal(updated.autoRenew, true);
    });

    it("invoice.update (success) records a renewal payment and extends the subscription", async () => {
      const user = await createUser({ email: "recurrenew@test.com", password: "PayPass123!" });
      const sub = await createSubscription({
        userId: user.id,
        status: "active",
        autoRenew: true,
        paystackSubscriptionCode: "SUB_RENEW_123",
        plan: "weekly",
      });
      const oldRenewal = new Date(sub.nextRenewal);

      const { rawBody, sig } = signedWebhook("invoice.update", {
        amount: 10000,
        status: "success",
        reference: "RENEWAL-REF-001",
        transaction: { reference: "RENEWAL-REF-001" },
        paid_at: new Date().toISOString(),
        authorization: { last4: "4242" },
        subscription: {
          subscription_code: "SUB_RENEW_123",
          plan: { plan_code: "PLN_weekly" },
        },
      });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const payment = await prisma.payment.findUnique({ where: { reference: "RENEWAL-REF-001" } });
      assert.ok(payment);
      assert.equal(payment.status, "success");
      assert.equal(payment.last4, "4242");

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "active");
      assert.ok(new Date(updated.nextRenewal) > new Date(oldRenewal));
    });

    it("invoice.update (failed) moves an active subscription to past_due", async () => {
      const user = await createUser({ email: "recurfail@test.com", password: "PayPass123!" });
      const sub = await createSubscription({
        userId: user.id,
        status: "active",
        autoRenew: true,
        paystackSubscriptionCode: "SUB_FAIL_123",
      });

      const { rawBody, sig } = signedWebhook("invoice.update", {
        amount: 10000,
        status: "failed",
        reference: "RENEWAL-FAIL-001",
        transaction: { reference: "RENEWAL-FAIL-001" },
        subscription: { subscription_code: "SUB_FAIL_123" },
      });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "past_due");
      const failed = await prisma.payment.findUnique({ where: { reference: "RENEWAL-FAIL-001" } });
      assert.equal(failed.status, "failed");
    });

    it("subscription.disable cancels the subscription by its Paystack code", async () => {
      const user = await createUser({ email: "recursub@test.com", password: "PayPass123!" });
      const sub = await createSubscription({
        userId: user.id,
        status: "active",
        autoRenew: true,
        paystackSubscriptionCode: "SUB_DISABLE_123",
      });

      const { rawBody, sig } = signedWebhook("subscription.disable", { subscription_code: "SUB_DISABLE_123" });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "cancelled");
      assert.equal(updated.autoRenew, false);
    });

    it("a recurring charge.success creates a payment row and keeps the subscription active", async () => {
      const user = await createUser({ email: "recurcharge@test.com", password: "PayPass123!" });
      const sub = await createSubscription({
        userId: user.id,
        status: "active",
        autoRenew: true,
        paystackSubscriptionCode: "SUB_CHARGE_123",
      });
      const oldRenewal = new Date(sub.nextRenewal);

      const { rawBody, sig } = signedWebhook("charge.success", {
        reference: "CHARGE-REF-001",
        amount: 10000,
        subscription_code: "SUB_CHARGE_123",
        authorization: { last4: "4088" },
      });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const payment = await prisma.payment.findUnique({ where: { reference: "CHARGE-REF-001" } });
      assert.ok(payment);
      assert.equal(payment.status, "success");
      assert.equal(payment.last4, "4088");

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "active");
      assert.ok(new Date(updated.nextRenewal) > new Date(oldRenewal));
    });
  });
});
