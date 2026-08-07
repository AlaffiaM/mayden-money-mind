import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "./helpers.js";
import { sendDailyReminder } from "../src/services/dailyReminderService.js";

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
