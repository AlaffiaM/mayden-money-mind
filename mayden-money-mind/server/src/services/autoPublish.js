// Auto-publish service — checks for scheduled episodes and publishes them at the configured release time
// Also sends in-app notifications to all active subscribers
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Runs every 15 minutes to check for episodes ready to publish
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export async function checkAndPublishEpisodes() {
  const now = new Date();

  // Get configured release time (default 06:00)
  const releaseSetting = await prisma.setting.findUnique({ where: { key: "episodeReleaseTime" } });
  const releaseTime = releaseSetting?.value || "06:00";
  const [hours, minutes] = releaseTime.split(":").map(Number);

  // Build today's publish cutoff: today at the release time
  const todayCutoff = new Date(now);
  todayCutoff.setHours(hours, minutes, 0, 0);

  // Only publish if we're past the release time today
  if (now < todayCutoff) return;

  // Find episodes that are draft/scheduled and whose publishDate is today or earlier
  const readyEpisodes = await prisma.episode.findMany({
    where: {
      status: { in: ["draft", "scheduled"] },
      publishDate: { lte: todayCutoff },
    },
  });

  for (const episode of readyEpisodes) {
    // Publish the episode
    await prisma.episode.update({
      where: { id: episode.id },
      data: { status: "published" },
    });

    // Notify all active subscribers
    await prisma.notification.create({
      data: {
        title: `New Episode: ${episode.title}`,
        body: `Today's ${episode.dayType} episode is now available. Tap to listen.`,
        channels: "inapp",
        sentBy: "system",
      },
    });
  }
}

let autoPublishTimer = null;

export function startAutoPublisher() {
  if (autoPublishTimer) return;
  // Run immediately on start, then every 15 minutes
  checkAndPublishEpisodes().catch(() => {});
  autoPublishTimer = setInterval(() => {
    checkAndPublishEpisodes().catch(() => {});
  }, CHECK_INTERVAL_MS);
}

export function stopAutoPublisher() {
  if (autoPublishTimer) {
    clearInterval(autoPublishTimer);
    autoPublishTimer = null;
  }
}
