import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, createUser, login } from "./helpers.js";

describe("Notifications", () => {
  let token;

  before(async () => {
    await createUser({ email: "notif@test.com", password: "NotifPass123!" });
    token = await login("notif@test.com", "NotifPass123!");
  });

  it("rejects an invalid notification id", async () => {
    const res = await request(app)
      .post("/api/notifications/abc/read")
      .set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 400);
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
