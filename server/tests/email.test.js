import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { sendEmail, sendUserEmail, sendWelcomeEmail } from "../src/services/emailService.js";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

async function captureFetch() {
  const calls = [];
  const m = mock.method(globalThis, "fetch", async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return { ok: true, text: async () => "" };
  });
  return { calls, m };
}

function brevoCall(calls) {
  return calls.find((c) => c.url === BREVO_URL);
}

describe("email service", () => {
  afterEach(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_FROM_EMAIL;
  });

  it("no-ops when Brevo is not configured", async () => {
    const result = await sendEmail({ to: "x@y.com", subject: "t", htmlContent: "<p>hi</p>" });
    assert.deepEqual(result, { sent: false, reason: "brevo not configured" });
  });

  it("sends via Brevo with the api-key header and branded welcome HTML", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_FROM_EMAIL = "sender@test.com";
    const { calls, m } = await captureFetch();
    try {
      await sendWelcomeEmail({
        to: "ada@test.com",
        fullName: "Ada <script>",
        plan: "weekly",
        nextRenewal: new Date("2026-09-01T12:00:00Z"),
      });
    } finally {
      m.mock.restore();
    }

    const call = brevoCall(calls);
    assert.ok(call, "expected a Brevo API call");
    assert.equal(call.options.headers["api-key"], "test-key");
    assert.ok(call.options.signal instanceof AbortSignal, "fetch should carry a timeout signal");

    const body = JSON.parse(call.options.body);
    assert.equal(body.subject, "Welcome to Money & Mind");
    assert.match(body.htmlContent, /assets\/logo\.jpg/);
    assert.match(body.htmlContent, /Ada &lt;script&gt;/);
    assert.match(body.htmlContent, /Weekly/);
    assert.match(body.htmlContent, /₦100/);
  });

  it("escapes user content in sendUserEmail", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_FROM_EMAIL = "sender@test.com";
    const { calls, m } = await captureFetch();
    try {
      await sendUserEmail({ to: "a@b.com", subject: "hi", title: "Hello <b>", body: '<b onclick="x()">bold</b>' });
    } finally {
      m.mock.restore();
    }

    const body = JSON.parse(brevoCall(calls).options.body);
    assert.match(body.htmlContent, /Hello &lt;b&gt;/);
    assert.doesNotMatch(body.htmlContent, /<b onclick="x\(\)">/);
    assert.doesNotMatch(body.htmlContent, /<script/);
  });

  it("throws when Brevo returns a non-OK response", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_FROM_EMAIL = "sender@test.com";
    const m = mock.method(globalThis, "fetch", async () => ({ ok: false, status: 500, text: async () => "boom" }));
    try {
      await assert.rejects(() => sendEmail({ to: "a@b.com", subject: "t", textContent: "x" }), /Brevo API 500/);
    } finally {
      m.mock.restore();
    }
  });
});
