import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app, prisma, createUser, createSubscription, login } from "./helpers.js";
import { signAudioUrl } from "../src/utils/audioAccessControl.js";

// Sample file that is whitelisted as public (no token needed)
const SAMPLE_FILE = "/audio/Maiden Microfinance Bank MONDAY.mp3.mpeg";
// A real protected content file that lives in server/storage/audio/Maiden/
const PROTECTED_FILE = "/audio/Maiden/Maiden%20Microfinance%20Bank%20Friday%201.mp3";

describe("Audio access control", () => {
  it("serves the public sample without a token", async () => {
    const res = await request(app).get(`/api/audio?file=${encodeURIComponent(SAMPLE_FILE)}`);
    assert.equal(res.status, 200);
  });

  it("rejects a protected file without a token", async () => {
    const res = await request(app).get(`/api/audio?file=${encodeURIComponent(PROTECTED_FILE)}`);
    assert.equal(res.status, 403);
  });

  it("rejects an expired signed token", async () => {
    const url = signAudioUrl(PROTECTED_FILE, -10); // already expired
    const res = await request(app).get(url);
    assert.equal(res.status, 403);
  });

  it("rejects a tampered signature", async () => {
    const url = signAudioUrl(PROTECTED_FILE, 600);
    const tampered = url.replace(/sig=[a-f0-9]/i, (m) => (m[4] === "0" ? "1" : "0"));
    const res = await request(app).get(tampered);
    assert.equal(res.status, 403);
  });

  it("serves a protected file with a valid signed token", async () => {
    const url = signAudioUrl(PROTECTED_FILE, 600);
    const res = await request(app).get(url);
    assert.equal(res.status, 200);
  });

  it("blocks path traversal attempts", async () => {
    const res = await request(app).get(`/api/audio?file=${encodeURIComponent("/audio/../.env")}`);
    assert.equal(res.status, 403);
    const res2 = await request(app).get(`/api/audio?file=${encodeURIComponent("..%2F..%2F..%2Fserver%2Fprisma%2Fdev.db")}`);
    assert.equal(res2.status, 403);
  });
});

describe("Per-play stream endpoint (/api/episodes/:id/stream)", () => {
  let subscriberToken;
  let freeToken;
  let episodeId;

  before(async () => {
    const subscriber = await createUser({ email: "sub@test.com", phone: "08000000001", password: "SubPass123!" });
    await createSubscription({ userId: subscriber.id, status: "active" });
    subscriberToken = await login("sub@test.com", "SubPass123!");

    const free = await createUser({ email: "free@test.com", phone: "08000000002", password: "FreePass123!" });
    freeToken = await login("free@test.com", "FreePass123!");

    const episode = await prisma.episode.create({
      data: {
        title: "Test Friday Episode",
        dayType: "friday",
        audioUrl: PROTECTED_FILE,
        runTimeSeconds: 60,
        showNotes: "",
        publishDate: new Date(),
        status: "published",
      },
    });
    episodeId = episode.id;
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post(`/api/episodes/${episodeId}/stream`);
    assert.equal(res.status, 401);
  });

  it("rejects a user without an active subscription", async () => {
    const res = await request(app)
      .post(`/api/episodes/${episodeId}/stream`)
      .set("Authorization", `Bearer ${freeToken}`);
    assert.equal(res.status, 403);
  });

  it("mints a working signed URL for an active subscriber", async () => {
    const res = await request(app)
      .post(`/api/episodes/${episodeId}/stream`)
      .set("Authorization", `Bearer ${subscriberToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.url && res.body.url.includes("/api/audio?file="), "should return a signed stream url");

    const play = await request(app).get(res.body.url);
    assert.equal(play.status, 200);
  });

  it("returns 404 for a non-published episode", async () => {
    const draft = await prisma.episode.create({
      data: {
        title: "Draft Episode",
        dayType: "monday",
        runTimeSeconds: 0,
        showNotes: "",
        publishDate: new Date(),
        status: "draft",
      },
    });
    const res = await request(app)
      .post(`/api/episodes/${draft.id}/stream`)
      .set("Authorization", `Bearer ${subscriberToken}`);
    assert.equal(res.status, 404);
  });

  it("returns 404 when the episode has no audio assigned", async () => {
    const silent = await prisma.episode.create({
      data: {
        title: "No Audio Episode",
        dayType: "tuesday",
        runTimeSeconds: 0,
        showNotes: "",
        publishDate: new Date(),
        status: "published",
      },
    });
    const res = await request(app)
      .post(`/api/episodes/${silent.id}/stream`)
      .set("Authorization", `Bearer ${subscriberToken}`);
    assert.equal(res.status, 404);
  });

  it("episode listings never expose a signed audio URL", async () => {
    const res = await request(app)
      .get("/api/episodes/library")
      .set("Authorization", `Bearer ${subscriberToken}`);
    assert.equal(res.status, 200);
    for (const ep of res.body) {
      assert.equal(ep.audioUrl, null);
    }
  });
});
