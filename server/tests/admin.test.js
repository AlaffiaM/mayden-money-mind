import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser, createSubscription, createPayment, login } from "./helpers.js";

describe("Admin access control", () => {
  let adminToken;
  let userToken;
  let admin;

  before(async () => {
    admin = await createUser({ email: "admin@test.com", password: "AdminPass123!", role: "admin" });
    await createUser({ email: "regular@test.com", password: "RegularPass123!" });
    adminToken = await login("admin@test.com", "AdminPass123!");
    userToken = await login("regular@test.com", "RegularPass123!");
  });

  it("rejects admin routes without a token", async () => {
    const res = await request(app).get("/api/admin/stats");
    assert.equal(res.status, 401);
  });

  it("rejects admin routes for non-admin users", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${userToken}`);
    assert.equal(res.status, 403);
  });

  it("allows admin users", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
  });

  it("blocks a demoted admin immediately (no stale JWT trust)", async () => {
    await prisma.user.update({ where: { id: admin.id }, data: { role: "user" } });
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${adminToken}`);
    assert.equal(res.status, 403);
    // restore for any later tests
    await prisma.user.update({ where: { id: admin.id }, data: { role: "admin" } });
  });
});

describe("Admin deletions", () => {
  let adminToken;

  before(async () => {
    await createUser({ email: "deladmin@test.com", password: "AdminPass123!", role: "admin" });
    adminToken = await login("deladmin@test.com", "AdminPass123!");
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  it("deletes a notification along with its reads (transactional)", async () => {
    const notif = await prisma.notification.create({
      data: { title: "To Delete", body: "bye", channels: "inapp", sentBy: "admin" },
    });
    const reader = await createUser({ email: "delread@test.com", password: "Password123!" });
    await prisma.notificationRead.create({
      data: { notificationId: notif.id, userId: reader.id },
    });

    const res = await request(app).delete(`/api/admin/notifications/${notif.id}`).set(auth());
    assert.equal(res.status, 200);

    assert.equal(await prisma.notification.findUnique({ where: { id: notif.id } }), null);
    assert.equal(await prisma.notificationRead.count({ where: { notificationId: notif.id } }), 0);
  });

  it("clears all notifications and their reads", async () => {
    for (let i = 0; i < 3; i++) {
      const notif = await prisma.notification.create({
        data: { title: `Bulk ${i}`, body: "x", channels: "inapp", sentBy: "admin" },
      });
      const reader = await createUser({ email: `bulkread${i}@test.com`, password: "Password123!" });
      await prisma.notificationRead.create({ data: { notificationId: notif.id, userId: reader.id } });
    }

    const res = await request(app).delete("/api/admin/notifications").set(auth());
    assert.equal(res.status, 200);

    assert.equal(await prisma.notification.count(), 0);
    assert.equal(await prisma.notificationRead.count(), 0);
  });

  it("deletes a user with all their related rows (no FK violations)", async () => {
    const victim = await createUser({ email: "delvictim@test.com", password: "Password123!" });
    const sub = await createSubscription({ userId: victim.id, status: "active" });
    await createPayment({ userId: victim.id, subscriptionId: sub.id, status: "success" });
    const episode = await prisma.episode.create({
      data: {
        title: "Del Ep",
        dayType: "monday",
        runTimeSeconds: 300,
        showNotes: "",
        publishDate: new Date(),
        status: "published",
      },
    });
    await prisma.listenLog.create({ data: { userId: victim.id, episodeId: episode.id } });
    const notif = await prisma.notification.create({
      data: { title: "n", body: "b", channels: "inapp", sentBy: "admin" },
    });
    await prisma.notificationRead.create({ data: { userId: victim.id, notificationId: notif.id } });

    const res = await request(app).delete(`/api/admin/users/${victim.id}`).set(auth());
    assert.equal(res.status, 200);

    assert.equal(await prisma.user.findUnique({ where: { id: victim.id } }), null);
    assert.equal(await prisma.subscription.count({ where: { userId: victim.id } }), 0);
    assert.equal(await prisma.payment.count({ where: { userId: victim.id } }), 0);
    assert.equal(await prisma.listenLog.count({ where: { userId: victim.id } }), 0);
    assert.equal(await prisma.notificationRead.count({ where: { userId: victim.id } }), 0);
  });

  it("rejects deleting an admin user", async () => {
    const admin2 = await createUser({ email: "deladmin2@test.com", password: "AdminPass123!", role: "admin" });
    const res = await request(app).delete(`/api/admin/users/${admin2.id}`).set(auth());
    assert.equal(res.status, 400);
  });
});
