import { prisma } from "../config/prisma.js";
import { signAudioUrl } from "../utils/audioAccessControl.js";
import { businessDateStr, businessDayOfWeek, businessToday } from "../utils/businessTime.js";

async function isSubscriber(userId) {
  if (!userId) return false;
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "active" },
    select: { id: true },
  });
  return !!sub;
}

function serialize(episodes) {
  return episodes.map((e) => ({
    ...e,
    listenCount: e._count?.listenLogs ?? 0,
    _count: undefined,
    audioUrl: null,
  }));
}

export async function list(req, res, next) {
  try {
    const episodes = await prisma.episode.findMany({
      where: { status: "published" },
      orderBy: { publishDate: "desc" },
      include: { _count: { select: { listenLogs: true } } },
    });

    const episodeMap = new Map();
    for (const episode of episodes) {

      const safeTitle = (episode.title || '').trim();
      const key = `${safeTitle}-${businessDateStr(new Date(episode.publishDate))}`;

      if (!episodeMap.has(key) ||
          (episodeMap.get(key).createdAt < episode.createdAt)) {
        episodeMap.set(key, episode);
      }
    }

    const uniqueEpisodes = Array.from(episodeMap.values()).sort((a, b) =>
      new Date(b.publishDate) - new Date(a.publishDate)
    );

    res.json(serialize(uniqueEpisodes));
  } catch (err) {
    next(err);
  }
}

export async function library(req, res, next) {
  try {
    const userId = req.user.id;

    const weekStart = new Date(businessToday());
    const todayDow = businessDayOfWeek(weekStart);
    weekStart.setUTCDate(weekStart.getUTCDate() + (todayDow === 0 ? -6 : 1 - todayDow));
    const weekEndExclusive = new Date(weekStart);
    weekEndExclusive.setUTCDate(weekEndExclusive.getUTCDate() + 5);

    const episodes = await prisma.episode.findMany({
      where: {
        status: "published",
        publishDate: {
          gte: weekStart,
          lt: weekEndExclusive,
        },
      },
      orderBy: { publishDate: "asc" },
      include: { _count: { select: { listenLogs: true } } },
    });

    const episodeMap = new Map();
    for (const episode of episodes) {

      const safeTitle = (episode.title || '').trim();
      const key = `${safeTitle}-${businessDateStr(new Date(episode.publishDate))}`;

      if (!episodeMap.has(key) ||
          (episodeMap.get(key).createdAt < episode.createdAt)) {
        episodeMap.set(key, episode);
      }
    }

    const uniqueEpisodes = Array.from(episodeMap.values()).sort((a, b) =>
      new Date(a.publishDate) - new Date(b.publishDate)
    );

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

      const locked = businessDateStr(new Date(e.publishDate)) > businessDateStr(new Date());

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

export async function today(req, res, next) {
  try {

    const todayStart = businessToday();
    const tomorrow = new Date(todayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const episode = await prisma.episode.findFirst({
      where: {
        publishDate: { gte: todayStart, lt: tomorrow },
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

    const unlocked = businessDateStr(new Date(episode.publishDate)) <= businessDateStr(new Date());

    if (!unlocked) {
      return res.status(403).json({ error: "Episode not yet unlocked" });
    }

    res.json({ url: signAudioUrl(episode.audioUrl, { userId: req.user.id }) });
  } catch (err) {
    next(err);
  }
}

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
