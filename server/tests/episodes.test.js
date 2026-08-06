import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser, createSubscription, login } from "./helpers.js";

const PROTECTED_FILE = "/audio/Maiden/Maiden%20Microfinance%20Bank%20Friday%201.mp3";

describe("Episodes", () => {
  let user;
  let token;

  before(async () => {
    user = await createUser({ email: "epi@test.com", password: "EpiPass123!" });
    await createSubscription({ userId: user.id, status: "active" });
    token = await login("epi@test.com", "EpiPass123!");
  });

  it("hides draft episodes from the public detail endpoint (F8)", async () => {
    const draft = await prisma.episode.create({
      data: { title: "Secret Draft", dayType: "monday", showNotes: "", runTimeSeconds: 0, publishDate: new Date(), status: "draft" },
    });
    const res = await request(app).get(`/api/episodes/${draft.id}`);
    assert.equal(res.status, 404);
  });

  it("returns null audioUrl to anonymous users on /today", async () => {
    await prisma.episode.create({
      data: { title: "Today's Ep", dayType: "friday", showNotes: "", runTimeSeconds: 0, publishDate: new Date(), status: "published", audioUrl: PROTECTED_FILE },
    });
    const res = await request(app).get("/api/episodes/today");
    assert.equal(res.status, 200);
    assert.equal(res.body.audioUrl, null);
  });

  it("returns a signed audioUrl to active subscribers on /today", async () => {
    const res = await request(app).get("/api/episodes/today").set("Authorization", `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.audioUrl?.startsWith("/api/audio?file="));
  });
});
