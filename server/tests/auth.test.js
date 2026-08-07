import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import request from "supertest";
import { app, prisma, createUser } from "./helpers.js";

describe("Authentication", () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "User"');
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

describe("Password reset", () => {
  const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");
  const rawToken = () => crypto.randomBytes(32).toString("hex");

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "User"');
  });

  it("forgot-password stores a hashed one-hour token for an existing user", async () => {
    await createUser({ email: "reset@test.com", password: "OldPass123!" });

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset@test.com" });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true });

    const user = await prisma.user.findUnique({ where: { email: "reset@test.com" } });
    assert.ok(user.resetPasswordToken, "a reset token should be stored");
    assert.match(user.resetPasswordToken, /^[0-9a-f]{64}$/, "stored token should be a sha256 hash");
    assert.ok(user.resetPasswordExpires > new Date());
    assert.ok(user.resetPasswordExpires <= new Date(Date.now() + 61 * 60000));
  });

  it("forgot-password does not reveal whether an account exists", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@test.com" });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true });
  });

  it("forgot-password rejects an invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });
    assert.equal(res.status, 400);
  });

  it("reset-password updates the password and invalidates the old one", async () => {
    const user = await createUser({ email: "reset@test.com", password: "OldPass123!" });
    const raw = rawToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hash(raw), resetPasswordExpires: new Date(Date.now() + 60000) },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: raw, password: "NewPass123!" });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { success: true });

    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset@test.com", password: "OldPass123!" });
    assert.equal(oldLogin.status, 401, "old password must stop working");

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset@test.com", password: "NewPass123!" });
    assert.equal(newLogin.status, 200, "new password must work");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated.resetPasswordToken, null, "token should be cleared after use");
  });

  it("reset-password rejects an expired token", async () => {
    const user = await createUser({ email: "reset@test.com", password: "OldPass123!" });
    const raw = rawToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hash(raw), resetPasswordExpires: new Date(Date.now() - 1000) },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: raw, password: "NewPass123!" });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid or has expired/);
  });

  it("reset-password rejects an unknown token", async () => {
    await createUser({ email: "reset@test.com", password: "OldPass123!" });
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken(), password: "NewPass123!" });
    assert.equal(res.status, 400);
  });

  it("reset-password rejects a weak password", async () => {
    const user = await createUser({ email: "reset@test.com", password: "OldPass123!" });
    const raw = rawToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hash(raw), resetPasswordExpires: new Date(Date.now() + 60000) },
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: raw, password: "short" });
    assert.equal(res.status, 400);
  });

  it("reset token is single use", async () => {
    const user = await createUser({ email: "reset@test.com", password: "OldPass123!" });
    const raw = rawToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: hash(raw), resetPasswordExpires: new Date(Date.now() + 60000) },
    });

    const first = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: raw, password: "NewPass123!" });
    assert.equal(first.status, 200);

    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: raw, password: "AnotherPass123!" });
    assert.equal(second.status, 400, "a used token must not work again");
  });
});
