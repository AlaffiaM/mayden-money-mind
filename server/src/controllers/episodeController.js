// Episode handlers — public listing, today's episode, and listen logging
// Episode metadata is public, but audio URLs are only issued to active
// subscribers (as short-lived signed URLs). Anonymous/public responses get
// audioUrl: null so the audio content stays protected.
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

// Flattens episodes and attaches a signed audioUrl only when the requester
// is allowed to listen; otherwise audioUrl is null.
export function serialize(episodes, canListen) {
  return episodes.map((e) => ({
    ...e,
    listenCount: e._count?.listenLogs ?? 0,
    _count: undefined,
    audioUrl: canListen && e.audioUrl ? signAudioUrl(e.audioUrl) : null,
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
    const canListen = await isSubscriber(req.user?.id);
    res.json(serialize(episodes, canListen));
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

    const canListen = await isSubscriber(userId);
    const mapped = serialize(episodes, canListen).map((e) => ({
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

    const canListen = await isSubscriber(req.user?.id);
    res.json({
      ...episode,
      audioUrl: canListen && episode.audioUrl ? signAudioUrl(episode.audioUrl) : null,
    });
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
