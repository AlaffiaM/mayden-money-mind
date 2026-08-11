import { describe, it, before, after, beforeEach, mock } from "node:test";
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

  it("initializes a payment in dev mode (no Paystack key) without a redirect", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "pending" });
    const res = await request(app)
      .post("/api/payments/initialize")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ subscriptionId: sub.id });
    assert.equal(res.status, 200);
    assert.equal(res.body.redirectUrl, null);
    assert.equal(res.body.payment.status, "pending");
    assert.equal(res.body.payment.subscriptionId, sub.id);
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

    it("links a reusable card payment to a recurring Paystack subscription", async () => {
      const { sub, payment } = await makePendingPayment();
      const fetchMock = mock.method(globalThis, "fetch", async (url, options = {}) => {
        const body = JSON.parse(options.body || "{}");
        if (String(url).endsWith("/plan")) {
          return {
            ok: true,
            json: async () => ({
              status: true,
              data: { plan_code: body.name?.includes("Weekly") ? "PLN_WEEKLY" : "PLN_MONTHLY" },
            }),
          };
        }
        if (String(url).endsWith("/subscription")) {
          return {
            ok: true,
            json: async () => ({ status: true, data: { subscription_code: "SUB_LINKED_CARD" } }),
          };
        }
        return { ok: true, json: async () => ({ status: false }) };
      });

      try {
        const { rawBody, sig } = signedWebhook("charge.success", {
          reference: payment.reference,
          amount: 10000,
          authorization: { channel: "card", reusable: true, authorization_code: "AUTH_CARD_1", last4: "4242" },
          customer: { customer_code: "CUS_CARD_1" },
        });
        const res = await request(app)
          .post("/api/payments/webhook")
          .set("Content-Type", "application/json")
          .set("x-paystack-signature", sig)
          .send(rawBody);
        assert.equal(res.status, 200);
      } finally {
        fetchMock.mock.restore();
      }

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "active");
      assert.equal(updated.autoRenew, true);
      assert.equal(updated.paystackSubscriptionCode, "SUB_LINKED_CARD");
      assert.equal(updated.paystackPlanCode, "PLN_WEEKLY");
    });

    it("keeps non-card payments one-time (no Paystack subscription, autoRenew false)", async () => {
      const { sub, payment } = await makePendingPayment();
      const { rawBody, sig } = signedWebhook("charge.success", {
        reference: payment.reference,
        amount: 10000,
        authorization: { channel: "bank_transfer", reusable: false },
      });
      const res = await request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
      assert.equal(res.status, 200);

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "active");
      assert.equal(updated.autoRenew, false);
      assert.equal(updated.paystackSubscriptionCode, null);
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

  describe("welcome email", () => {
    beforeEach(() => {
      process.env.PAYSTACK_SECRET_KEY = "sk_test_webhook_abc123";
      process.env.BREVO_API_KEY = "test-key";
      process.env.BREVO_FROM_EMAIL = "sender@test.com";
    });
    after(() => {
      delete process.env.PAYSTACK_SECRET_KEY;
      delete process.env.BREVO_API_KEY;
      delete process.env.BREVO_FROM_EMAIL;
    });

    function signedWebhook(event, payload) {
      const rawBody = JSON.stringify({ event, data: payload });
      const sig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
      return { rawBody, sig };
    }

    async function chargeSuccess(reference) {
      const { rawBody, sig } = signedWebhook("charge.success", { reference, amount: 10000 });
      return request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("x-paystack-signature", sig)
        .send(rawBody);
    }

    function captureBrevoCalls() {
      const calls = [];
      const fetchMock = mock.method(globalThis, "fetch", async (url, options = {}) => {
        calls.push({ url: String(url), body: JSON.parse(options.body || "{}") });
        return { ok: true, text: async () => "" };
      });
      return { calls, fetchMock };
    }

    const brevoCalls = (calls) => calls.filter((c) => c.url === "https://api.brevo.com/v3/smtp/email");

    it("sends the welcome email once on the first charge.success", async () => {
      const user = await createUser({ email: "welcome@test.com", password: "PayPass123!" });
      const sub = await createSubscription({ userId: user.id, status: "pending" });
      const payment = await createPayment({ userId: user.id, subscriptionId: sub.id, amount: 100, reference: "WELCOME-REF-001" });

      const { calls, fetchMock } = captureBrevoCalls();
      try {
        const res = await chargeSuccess(payment.reference);
        assert.equal(res.status, 200);
      } finally {
        fetchMock.mock.restore();
      }

      const emails = brevoCalls(calls);
      assert.equal(emails.length, 1);
      assert.equal(emails[0].body.subject, "Welcome to Money & Mind");
      assert.match(emails[0].body.htmlContent, /Welcome to/);

      const marker = await prisma.setting.findUnique({ where: { key: `welcome-${sub.id}` } });
      assert.equal(marker.value, "sent");
    });

    it("does not resend on a duplicate webhook delivery", async () => {
      const user = await createUser({ email: "welcome2@test.com", password: "PayPass123!" });
      const sub = await createSubscription({ userId: user.id, status: "pending" });
      const payment = await createPayment({ userId: user.id, subscriptionId: sub.id, amount: 100, reference: "WELCOME-REF-002" });

      const { calls, fetchMock } = captureBrevoCalls();
      try {
        assert.equal((await chargeSuccess(payment.reference)).status, 200);
        assert.equal((await chargeSuccess(payment.reference)).status, 200);
      } finally {
        fetchMock.mock.restore();
      }

      assert.equal(brevoCalls(calls).length, 1);
      assert.equal(await prisma.setting.count({ where: { key: `welcome-${sub.id}` } }), 1);
    });

    it("keeps the subscription active and rolls back the marker if the email fails", async () => {
      const user = await createUser({ email: "welcome3@test.com", password: "PayPass123!" });
      const sub = await createSubscription({ userId: user.id, status: "pending" });
      const payment = await createPayment({ userId: user.id, subscriptionId: sub.id, amount: 100, reference: "WELCOME-REF-003" });

      const fetchMock = mock.method(globalThis, "fetch", async () => {
        throw new Error("brevo down");
      });
      try {
        const res = await chargeSuccess(payment.reference);
        assert.equal(res.status, 200);
      } finally {
        fetchMock.mock.restore();
      }

      const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
      assert.equal(updated.status, "active");
      assert.equal(await prisma.setting.findUnique({ where: { key: `welcome-${sub.id}` } }), null);
    });
  });
});
