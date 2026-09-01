// Auto-publish service — checks for scheduled episodes and publishes them at the
// configured release time (business timezone Africa/Lagos).
import { prisma } from "../config/prisma.js";
import { businessToday } from "../utils/businessTime.js";
import logger from "../utils/logger.js";

// Runs every 15 minutes to check for episodes ready to publish
const CHECK_INTERVAL_MS = 15 * 60 * 1000;

async function checkAndPublishEpisodes() {
  const now = new Date();

  // Get configured release time (default 06:00, expressed in business timezone)
  const releaseSetting = await prisma.setting.findUnique({ where: { key: "episodeReleaseTime" } });
  const releaseTime = releaseSetting?.value || "06:00";
  const [hours, minutes] = releaseTime.split(":").map(Number);

  // Build today's publish cutoff: Lagos-midnight today plus the release time.
  // Lagos business days align with the UTC-midnight publishDate instants stored
  // by the scheduler, so this publishes on the same Lagos calendar day.
  const todayCutoff = new Date(businessToday().getTime() + (hours * 60 + minutes) * 60 * 1000);

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
