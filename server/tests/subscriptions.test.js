import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, createUser, createSubscription, login } from "./helpers.js";

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
