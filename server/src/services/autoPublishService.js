// Auto-publish service — checks for scheduled episodes and publishes them at the configured release time
import { prisma } from "../config/prisma.js";
import logger from "../utils/logger.js";

// Runs every 15 minutes to check for episodes ready to publish
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

async function checkAndPublishEpisodes() {
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
  }
}

let autoPublishTimer = null;

export function startAutoPublisher() {
  if (autoPublishTimer) return;
  // Run immediately on start, then every 15 minutes
  checkAndPublishEpisodes().catch((err) => logger.error("[auto-publish] initial run failed:", err.message));
  autoPublishTimer = setInterval(() => {
    checkAndPublishEpisodes().catch((err) => logger.error("[auto-publish] run failed:", err.message));
  }, CHECK_INTERVAL_MS);
  autoPublishTimer.unref();
}
