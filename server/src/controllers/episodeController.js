// Episode handlers — public listing, today's episode, and listen logging
// Episode metadata is public, but the audio content is protected: listings never
// contain a signed URL. Active subscribers mint a short-lived signed URL per
// play via POST /api/episodes/:id/stream, so copied links expire within seconds.
import { prisma } from "../config/prisma.js";
import { signAudioUrl } from "../utils/audioAccessControl.js";

// Returns true if the given user has an active subscription
async function isSubscriber(userId) {
  if (!userId) return false;
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    select: { id: true },
  });
  return !!sub;
}

// Flattens episodes for listings. audioUrl is always null here — audio is only
// handed out per-play through the /stream endpoint to active subscribers.
function serialize(episodes) {
  return episodes.map((e) => ({
    ...e,
    listenCount: e._count?.listenLogs ?? 0,
    _count: undefined,
    audioUrl: null,
  }));
}

// GET /api/episodes
export async function list(req, res, next) {
  try {
    const episodes = await prisma.episode.findMany({
      where: { status: "published" },
      orderBy: { publishDate: "desc" },
      include: { _count: { select: { listenLogs: true } } },
    });

    // Deduplicate episodes by title and publishDate (keeping the most recently created version)
    // This prevents showing multiple versions of the same episode in the full list
    const episodeMap = new Map();
    for (const episode of episodes) {
      // Create a key based on title and publish date (normalized to date only)
      // Handle null/undefined titles safely
      const safeTitle = (episode.title || '').trim();
      const dateKey = new Date(episode.publishDate);
      dateKey.setHours(0, 0, 0, 0);
      const key = `${safeTitle}-${dateKey.toISOString()}`;

      // If we haven't seen this episode title/date combination, or if this one is newer
      if (!episodeMap.has(key) ||
          (episodeMap.get(key).createdAt < episode.createdAt)) {
        episodeMap.set(key, episode);
      }
    }

    // Convert map back to array, sorted by publishDate (descending to match original order)
    const uniqueEpisodes = Array.from(episodeMap.values()).sort((a, b) =>
      new Date(b.publishDate) - new Date(a.publishDate)
    );

    res.json(serialize(uniqueEpisodes));
  } catch (err) {
    next(err);
  }
}

// GET /api/episodes/library
export async function library(req, res, next) {
  try {
    const userId = req.user.id;

    // Get today's date at midnight (start of day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get all published episodes from the current week (Monday-Friday)
    // We'll get episodes from the last 7 days to next 7 days to be safe,
    // then filter to Monday-Friday of the current week
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay() + (todayStart.getDay() === 0 ? -6 : 1)); // Monday of this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday of this week

    const episodes = await prisma.episode.findMany({
      where: {
        status: "published",
        publishDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: { publishDate: "asc" }, // Order by day of week (Mon, Tue, Wed, Thu, Fri)
      include: { _count: { select: { listenLogs: true } } },
    });

    // Deduplicate episodes by title and publishDate (keeping the most recently created version)
    const episodeMap = new Map();
    for (const episode of episodes) {
      // Create a key based on title and publish date (normalized to date only)
      // Handle null/undefined titles safely
      const safeTitle = (episode.title || '').trim();
      const dateKey = new Date(episode.publishDate);
      dateKey.setHours(0, 0, 0, 0);
      const key = `${safeTitle}-${dateKey.toISOString()}`;

      // If we haven't seen this episode title/date combination, or if this one is newer
      if (!episodeMap.has(key) ||
          (episodeMap.get(key).createdAt < episode.createdAt)) {
        episodeMap.set(key, episode);
      }
    }

    // Convert map back to array, sorted by publishDate
    const uniqueEpisodes = Array.from(episodeMap.values()).sort((a, b) =>
      new Date(a.publishDate) - new Date(b.publishDate)
    );

    // Get user's listen logs for these episodes to compute lastListened
    const episodeIds = uniqueEpisodes.map((e) => e.id);
    const logs = await prisma.listenLog.findMany({
      where: { userId, episodeId: { in: episodeIds } },
      select: { episodeId: true, createdAt: true },
    });

    const lastListened = {};
    for (const log of logs) {
      if (!lastListened[log.episodeId] || log.createdAt > lastListened[log.episodeId]) {
        lastListened[log.episodeId] = log.createdAt;
      }
    }

    const mapped = serialize(uniqueEpisodes).map((e) => {
      // Determine if episode is locked (publishDate is in the future)
      const episodeStart = new Date(e.publishDate);
      episodeStart.setHours(0, 0, 0, 0);
      const locked = episodeStart > todayStart;

      return {
        ...e,
        lastListened: lastListened[e.id],
        locked: locked,
      };
    });

    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

// GET /api/episodes/today
export async function today(req, res, next) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const episode = await prisma.episode.findFirst({
      where: {
        publishDate: { gte: today, lt: tomorrow },
        status: "published",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!episode) {
      return res.json({ message: "No episode for today yet" });
    }

    res.json({ ...episode, audioUrl: null });
  } catch (err) {
    next(err);
  }
}

// GET /api/episodes/my-library
// Returns the current user's PERSONAL listening library: the distinct episodes
// they have listened to, each with its lastListenedAt. This is private to the
// requesting user (filtered strictly by req.user.id). audioUrl is always null —
// playback is still gated through the /stream endpoint (active subscription).
// Saved items are returned even if the episode was later unpublished or the
// user's subscription has lapsed — they can view their history, but playback
// remains controlled by /stream.
export async function myLibrary(req, res, next) {
  try {
    const logs = await prisma.listenLog.findMany({
      where: { userId: req.user.id },
      orderBy: { lastListenedAt: "desc" },
      include: { episode: true },
    });

    const items = logs.map((log) => ({
      ...log.episode,
      lastListened: log.lastListenedAt,
      audioUrl: null,
      _count: undefined,
    }));

    res.json(items);
  } catch (err) {
    next(err);
  }
}

// POST /api/episodes/:id/stream — mints a fresh short-lived signed audio URL,
// but only for users with an active subscription AND for episodes that have
// been unlocked (publish date has passed). This is the single entry
// point for protected playback, so no reusable URL ever ships in listings.
export async function stream(req, res, next) {
  try {
    const episodeId = req.params.id;
    const episode = await prisma.episode.findFirst({
      where: { id: episodeId, status: "published" },
    });
    if (!episode) return res.status(404).json({ error: "Episode not found" });
    if (!episode.audioUrl) return res.status(404).json({ error: "No audio assigned to this episode" });

    // Check if user has active subscription
    if (!(await isSubscriber(req.user?.id))) {
      return res.status(403).json({ error: "Active subscription required" });
    }

    // Check if episode is unlocked (publish date has passed)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const episodeStart = new Date(episode.publishDate);
    episodeStart.setHours(0, 0, 0, 0);

    if (episodeStart > todayStart) {
      return res.status(403).json({ error: "Episode not yet unlocked" });
    }

    res.json({ url: signAudioUrl(episode.audioUrl) });
  } catch (err) {
    next(err);
  }
}

// GET /api/episodes/:id
export async function getById(req, res, next) {
  try {
    const episode = await prisma.episode.findFirst({
      where: { id: req.params.id, status: "published" },
    });
    if (!episode) return res.status(404).json({ error: "Episode not found" });
    res.json({ ...episode, audioUrl: null });
  } catch (err) {
    next(err);
  }
}

// POST /api/episodes/:id/listen
// Records that the user listened to this episode. Because ListenLog has a unique
// constraint on (userId, episodeId), repeated listens upsert the same row instead
// of creating duplicates — the row is the user's Library item (createdAt = first
// listened, lastListenedAt = most recent).
export async function listen(req, res, next) {
  try {
    const episodeId = req.params.id;
    const userId = req.user.id;

    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) return res.status(404).json({ error: "Episode not found" });

    await prisma.listenLog.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      update: { lastListenedAt: new Date() },
      create: { userId, episodeId, lastListenedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
