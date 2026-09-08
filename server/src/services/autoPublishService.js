

import { prisma } from "../config/prisma.js";
import { businessToday } from "../utils/businessTime.js";
import logger from "../utils/logger.js";


const CHECK_INTERVAL_MS = 15 * 60 * 1000;

async function checkAndPublishEpisodes() {
  const now = new Date();

  
  const releaseSetting = await prisma.setting.findUnique({ where: { key: "episodeReleaseTime" } });
  const releaseTime = releaseSetting?.value || "06:00";
  const [hours, minutes] = releaseTime.split(":").map(Number);

  
  
  
  const todayCutoff = new Date(businessToday().getTime() + (hours * 60 + minutes) * 60 * 1000);

  
  if (now < todayCutoff) return;

  
  const readyEpisodes = await prisma.episode.findMany({
    where: {
      status: { in: ["draft", "scheduled"] },
      publishDate: { lte: todayCutoff },
    },
  });

  for (const episode of readyEpisodes) {
    
    await prisma.episode.update({
      where: { id: episode.id },
      data: { status: "published" },
    });
  }
}

let autoPublishTimer = null;

export function startAutoPublisher() {
  if (autoPublishTimer) return;
  
  checkAndPublishEpisodes().catch((err) => logger.error("[auto-publish] initial run failed:", err.message));
  autoPublishTimer = setInterval(() => {
    checkAndPublishEpisodes().catch((err) => logger.error("[auto-publish] run failed:", err.message));
  }, CHECK_INTERVAL_MS);
  autoPublishTimer.unref();
}
