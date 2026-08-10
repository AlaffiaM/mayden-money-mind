// Episode handlers — public listing, today's episode, and listen logging
// Episode metadata is public, but the audio content is protected: listings never
// contain a signed URL. Active subscribers mint a short-lived signed URL per
// play via POST /api/episodes/:id/stream, so copied links expire within seconds.
import { prisma } from "../config/prisma.js";
import { signAudioUrl } from "../utils/audioAccessControl.js";

// Returns true if the given user has an active subscription
export async function isSubscriber(userId) {
  if (!userId) return false;
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    select: { id: true },
  });
  return !!sub;
}

// Flattens episodes for listings. audioUrl is always null here — audio is only
// handed out per-play through the /stream endpoint to active subscribers.
export function serialize(episodes) {
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
    res.json(serialize(episodes));
  } catch (err) {
    next(err);
  }
}

// GET /api/episodes/library
export async function library(req, res, next) {
  try {
    const userId = req.user.id;
    const logs = await prisma.listenLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { episodeId: true, createdAt: true },
    });
    const episodeIds = [...new Set(logs.map((l) => l.episodeId))];
    if (episodeIds.length === 0) return res.json([]);

    const episodes = await prisma.episode.findMany({
      where: { id: { in: episodeIds }, status: "published" },
      include: { _count: { select: { listenLogs: true } } },
    });

    const lastListened = {};
    for (const log of logs) {
      if (!lastListened[log.episodeId] || log.createdAt > lastListened[log.episodeId]) {
        lastListened[log.episodeId] = log.createdAt;
      }
    }

    const mapped = serialize(episodes).map((e) => ({
      ...e,
      lastListened: lastListened[e.id],
    }));
    mapped.sort((a, b) => (b.lastListened > a.lastListened ? 1 : -1));
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

// POST /api/episodes/:id/stream — mints a fresh short-lived signed audio URL,
// but only for users with an active subscription. This is the single entry
// point for protected playback, so no reusable URL ever ships in listings.
export async function stream(req, res, next) {
  try {
    const episodeId = req.params.id;
    const episode = await prisma.episode.findFirst({
      where: { id: episodeId, status: "published" },
    });
    if (!episode) return res.status(404).json({ error: "Episode not found" });
    if (!episode.audioUrl) return res.status(404).json({ error: "No audio assigned to this episode" });

    if (!(await isSubscriber(req.user?.id))) {
      return res.status(403).json({ error: "Active subscription required" });
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
export async function listen(req, res, next) {
  try {
    const episodeId = req.params.id;
    const userId = req.user.id;

    const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) return res.status(404).json({ error: "Episode not found" });

    await prisma.listenLog.create({
      data: { userId, episodeId },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
