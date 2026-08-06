import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser } from "./helpers.js";

describe("Authentication", () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe("DELETE FROM User");
  });

  it("registers a valid user and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Jane Doe", email: "jane@test.com", phone: "08012345678", password: "strongpass123" });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, "user");
  });

  it("rejects an invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Jane Doe", email: "not-an-email", password: "strongpass123" });
    assert.equal(res.status, 400);
  });

  it("rejects a weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Jane Doe", email: "jane@test.com", password: "short" });
    assert.equal(res.status, 400);
  });

  it("rejects duplicate email with 409", async () => {
    await createUser({ email: "dup@test.com" });
    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Jane Doe", email: "dup@test.com", password: "strongpass123" });
    assert.equal(res.status, 409);
  });

  it("rejects wrong password on login", async () => {
    await createUser({ email: "login@test.com", password: "RightPass123!" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@test.com", password: "WrongPass123!" });
    assert.equal(res.status, 401);
  });

  it("normalizes email case on login", async () => {
    await createUser({ email: "case@test.com", password: "RightPass123!" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "  CASE@Test.COM ", password: "RightPass123!" });
    assert.equal(res.status, 200);
  });
});

describe("Rate limiting", () => {
  it("returns 429 after too many auth attempts", async () => {
    let saw429 = false;
    for (let i = 0; i < 45; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: `nobody-${i}@test.com`, password: "wrong-password" });
      if (res.status === 429) {
        saw429 = true;
        break;
      }
    }
    assert.ok(saw429, "expected the auth rate limiter to trip");
  });
});
