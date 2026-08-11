import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser, createSubscription, login } from "./helpers.js";
import { processExpiredSubscriptions } from "../src/services/renewalService.js";

describe("Subscription status enforcement (F1)", () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  before(async () => {
    userA = await createUser({ email: "suba@test.com", password: "SubPass123!" });
    userB = await createUser({ email: "subb@test.com", password: "SubPass123!" });
    tokenA = await login("suba@test.com", "SubPass123!");
    tokenB = await login("subb@test.com", "SubPass123!");
  });

  it("blocks self-activation of a pending subscription (payment bypass)", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "pending" });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "active" });
    assert.equal(res.status, 400);
  });

  it("blocks plan changes via PATCH", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "active" });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ plan: "monthly" });
    assert.equal(res.status, 400);
  });

  it("blocks a pending subscription from being cancelled directly", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "pending" });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "cancelled" });
    assert.equal(res.status, 400);
  });

  it("updates a pending subscription to the newly clicked plan (monthly → charges 350)", async () => {
    const user = await createUser({ email: "subplan@test.com", password: "SubPass123!" });
    const token = await login("subplan@test.com", "SubPass123!");
    const pending = await createSubscription({ userId: user.id, status: "pending", plan: "weekly" });

    const res = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "monthly" });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, pending.id);
    assert.equal(res.body.plan, "monthly");
    assert.equal(res.body.status, "pending");

    const days = (new Date(res.body.nextRenewal) - new Date()) / 86400000;
    assert.ok(days > 25 && days < 31, `expected ~30 day renewal, got ${days}`);
  });

  it("returns the same pending subscription when the clicked plan is unchanged", async () => {
    const user = await createUser({ email: "subplansame@test.com", password: "SubPass123!" });
    const token = await login("subplansame@test.com", "SubPass123!");
    const pending = await createSubscription({ userId: user.id, status: "pending", plan: "monthly" });

    const res = await request(app)
      .post("/api/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ plan: "monthly" });
    assert.equal(res.status, 200);
    assert.equal(res.body.id, pending.id);
    assert.equal(res.body.plan, "monthly");
  });

  it("allows pause and resume of an active subscription", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "active" });
    const paused = await request(app)
      .patch(`/api/subscriptions/${sub.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "paused" });
    assert.equal(paused.status, 200);
    assert.equal(paused.body.status, "paused");

    const resumed = await request(app)
      .patch(`/api/subscriptions/${sub.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ status: "active" });
    assert.equal(resumed.status, 200);
    assert.equal(resumed.body.status, "active");
  });

  it("enforces ownership — a user cannot modify another user's subscription", async () => {
    const sub = await createSubscription({ userId: userA.id, status: "active" });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ status: "cancelled" });
    assert.equal(res.status, 403);
  });
});

describe("Auto-renewal toggle (F4)", () => {
  let user;
  let token;

  before(async () => {
    user = await createUser({ email: "renew@test.com", password: "RenewPass123!" });
    token = await login("renew@test.com", "RenewPass123!");
  });

  it("turning auto-renew off keeps access active but stops renewal", async () => {
    const sub = await createSubscription({
      userId: user.id,
      status: "active",
      autoRenew: true,
      paystackSubscriptionCode: "SUB_abc123",
    });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}/auto-renew`)
      .set("Authorization", `Bearer ${token}`)
      .send({ autoRenew: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.autoRenew, false);
    assert.equal(res.body.status, "active");
  });

  it("turning auto-renew back on re-enables the flag", async () => {
    const sub = await createSubscription({
      userId: user.id,
      status: "active",
      autoRenew: false,
    });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}/auto-renew`)
      .set("Authorization", `Bearer ${token}`)
      .send({ autoRenew: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.autoRenew, true);
  });

  it("rejects a non-boolean autoRenew value", async () => {
    const sub = await createSubscription({ userId: user.id, status: "active" });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}/auto-renew`)
      .set("Authorization", `Bearer ${token}`)
      .send({ autoRenew: "yes" });
    assert.equal(res.status, 400);
  });

  it("enforces ownership on the auto-renew endpoint", async () => {
    const other = await createUser({ email: "renewother@test.com", password: "RenewPass123!" });
    const otherToken = await login("renewother@test.com", "RenewPass123!");
    const sub = await createSubscription({ userId: user.id, status: "active" });
    const res = await request(app)
      .patch(`/api/subscriptions/${sub.id}/auto-renew`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ autoRenew: false });
    assert.equal(res.status, 403);
  });

  it("an active subscription with auto-renew off expires after its renewal date", async () => {
    const sub = await createSubscription({
      userId: user.id,
      status: "active",
      autoRenew: false,
      nextRenewalDays: -1,
    });
    await processExpiredSubscriptions();
    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    assert.equal(updated.status, "expired");
  });

  it("an active subscription with auto-renew on is not expired by the processor", async () => {
    const sub = await createSubscription({
      userId: user.id,
      status: "active",
      autoRenew: true,
      nextRenewalDays: -1,
    });
    await processExpiredSubscriptions();
    const updated = await prisma.subscription.findUnique({ where: { id: sub.id } });
    assert.equal(updated.status, "active");
  });
});

describe("Subscription read endpoints (regression: orderBy createdAt)", () => {
  let freshToken;

  before(async () => {
    const fresh = await createUser({ email: "subfresh@test.com", password: "SubPass123!" });
    freshToken = await login("subfresh@test.com", "SubPass123!");
  });

  it("GET /api/subscriptions/mine returns 200 + null for a user with no subscription", async () => {
    const res = await request(app)
      .get("/api/subscriptions/mine")
      .set("Authorization", `Bearer ${freshToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body, null);
  });

  it("GET /api/subscriptions/mine/status returns none for a user with no subscription", async () => {
    const res = await request(app)
      .get("/api/subscriptions/mine/status")
      .set("Authorization", `Bearer ${freshToken}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: "none", subscriptionId: null });
  });
});
