import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, createUser, login, prisma, createSubscription } from "./helpers.js";

describe("Notifications", () => {
  let token;
  let userId;

  const normalNotification = { title: "Admin update", body: "Hello", channels: "inapp", sentBy: "admin", subscribersOnly: false };
  const subscriberOnlyNotification = { title: "Time to Listen", body: "Your audio is ready", channels: "inapp", sentBy: "system", subscribersOnly: true };

  before(async () => {
    const user = await createUser({ email: "notif@test.com", password: "NotifPass123!" });
    userId = user.id;
    token = await login("notif@test.com", "NotifPass123!");
  });

  it("rejects an invalid notification id", async () => {
    const res = await request(app)
      .post("/api/notifications/abc/read")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 400);
  });

  it("hides subscribersOnly notifications from a user without an active subscription", async () => {
    await prisma.notification.create({ data: normalNotification });
    await prisma.notification.create({ data: subscriberOnlyNotification });

    const res = await request(app)
      .get("/api/notifications/latest")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    const titles = res.body.map((n) => n.title);
    assert.ok(titles.includes("Admin update"), "non-subscriber notifications should still appear");
    assert.ok(!titles.includes("Time to Listen"), "subscribersOnly notifications must be hidden");
  });

  it("shows subscribersOnly notifications to a user with an active subscription", async () => {
    await createSubscription({ userId, status: "active" });

    const res = await request(app)
      .get("/api/notifications/latest")
      .set("Authorization", `Bearer ${token}`);

    assert.equal(res.status, 200);
    const titles = res.body.map((n) => n.title);
    assert.ok(titles.includes("Admin update"));
    assert.ok(titles.includes("Time to Listen"));
  });
});

describe("CORS allowlist", () => {
  it("sets CORS header for an allowed origin", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
  });

  it("does not set CORS header for an unknown origin", async () => {
    const res = await request(app).get("/api/health").set("Origin", "http://evil.example.com");
    assert.equal(res.headers["access-control-allow-origin"], undefined);
  });
});
