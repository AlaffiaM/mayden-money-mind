import { describe, it, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma, createUser, createSubscription } from "./helpers.js";
import { sendDailyReminder } from "../src/services/dailyReminderService.js";
import { processExpiredSubscriptions } from "../src/services/renewalService.js";

// Release time is forced to "00:00" so the reminder is past its daily cutoff
// no matter when the suite runs. Default is "06:00".
async function setReleaseMidnight() {
  await prisma.setting.upsert({
    where: { key: "episodeReleaseTime" },
    update: { value: "00:00" },
    create: { key: "episodeReleaseTime", value: "00:00" },
  });
}

async function remindersByTitle() {
  return prisma.notification.findMany({ where: { title: "Time to Listen" } });
}

describe("Daily listen reminder", () => {
  beforeEach(async () => {
    // Fresh slate — no settings, no notifications between tests
    await prisma.notification.deleteMany();
    await prisma.setting.deleteMany();
    await setReleaseMidnight();
  });

  it("sends one subscribersOnly in-app reminder past the release time", async () => {
    await sendDailyReminder();

    const reminders = await remindersByTitle();
    assert.equal(reminders.length, 1);
    const reminder = reminders[0];
    assert.equal(reminder.channels, "inapp");
    assert.equal(reminder.sentBy, "system");
    assert.equal(reminder.subscribersOnly, true);
  });

  it("does not send a second reminder on the same day (idempotent)", async () => {
    await sendDailyReminder();
    await sendDailyReminder();

    assert.equal((await remindersByTitle()).length, 1);
  });

  it("does nothing before the release time", async (t) => {
    const now = new Date();
    const ahead = new Date(now.getTime() + 5 * 60000);
    // If 5 minutes from now rolls past midnight, the "today at HH:MM" cutoff
    // would already be in the past — skip in that narrow window.
    if (ahead.getHours() < now.getHours()) return t.skip("crosses midnight");

    const release = `${String(ahead.getHours()).padStart(2, "0")}:${String(ahead.getMinutes()).padStart(2, "0")}`;
    await prisma.setting.upsert({
      where: { key: "episodeReleaseTime" },
      update: { value: release },
      create: { key: "episodeReleaseTime", value: release },
    });

    await sendDailyReminder();
    assert.equal((await remindersByTitle()).length, 0);
  });

  it("names today's episode in the reminder body when one is published", async () => {
    await prisma.episode.create({
      data: {
        title: "Investing Basics",
        dayType: "monday",
        audioUrl: "https://example.com/a.mp3",
        runTimeSeconds: 600,
        showNotes: "<p>Notes</p>",
        publishDate: new Date(),
        status: "published",
      },
    });

    await sendDailyReminder();

    const reminders = await remindersByTitle();
    assert.equal(reminders.length, 1);
    assert.match(reminders[0].body, /Investing Basics/);
  });

  it("falls back to a generic body when no episode was published today", async () => {
    await sendDailyReminder();

    const reminders = await remindersByTitle();
    assert.equal(reminders.length, 1);
    assert.doesNotMatch(reminders[0].body, /"Today's episode/);
    assert.match(reminders[0].body, /ready/);
  });
});

describe("Renewal reminder emails", () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.setting.deleteMany();
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_FROM_EMAIL = "sender@test.com";
  });
  after(() => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_FROM_EMAIL;
  });

  // A past_due subscription whose 48h grace window started 12h ago (but hasn't
  // expired) — exactly where the first renewal reminder fires.
  async function makePastDueUser(email) {
    const user = await createUser({ fullName: "Renew Tester", email });
    const sub = await createSubscription({
      userId: user.id,
      status: "past_due",
      plan: "weekly",
      nextRenewalDays: 1.5, // nextRenewal = now + 36h → graceStart = now - 12h
    });
    return { user, sub };
  }

  const brevoCalls = (calls) => calls.filter((c) => c.url === "https://api.brevo.com/v3/smtp/email");

  it("emails a first reminder 12h into the grace period and records the in-app notification", async () => {
    const { sub } = await makePastDueUser("renew1@test.com");

    const calls = [];
    const fetchMock = mock.method(globalThis, "fetch", async (url, options = {}) => {
      calls.push({ url: String(url), body: JSON.parse(options.body || "{}") });
      return { ok: true, text: async () => "" };
    });
    try {
      await processExpiredSubscriptions();
    } finally {
      fetchMock.mock.restore();
    }

    const emails = brevoCalls(calls);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].body.to[0].email, "renew1@test.com");
    assert.equal(emails[0].body.subject, "Your Money & Mind renewal needs attention");
    assert.match(emails[0].body.htmlContent, /update your payment method/i);

    const reminder = await prisma.notification.findFirst({ where: { title: "Payment Reminder" } });
    assert.ok(reminder);
    assert.equal(reminder.channels, "inapp,email");

    const still = await prisma.subscription.findUnique({ where: { id: sub.id } });
    assert.equal(still.status, "past_due");
  });

  it("still records the in-app notification when the email send fails", async () => {
    await makePastDueUser("renew2@test.com");

    const fetchMock = mock.method(globalThis, "fetch", async () => {
      throw new Error("smtp down");
    });
    try {
      await processExpiredSubscriptions();
    } finally {
      fetchMock.mock.restore();
    }

    const reminder = await prisma.notification.findFirst({ where: { title: "Payment Reminder" } });
    assert.ok(reminder);
    assert.equal(reminder.channels, "inapp,email");
  });
});
