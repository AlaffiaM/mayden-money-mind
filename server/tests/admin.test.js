import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser, login } from "./helpers.js";

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
