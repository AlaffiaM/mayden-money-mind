import { describe, it } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "./helpers.js";
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
