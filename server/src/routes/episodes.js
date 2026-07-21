// Episode routes — public listing, today's episode, and listen logging
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

// GET /api/episodes — list published episodes with listen counts, ordered by publish date
router.get("/", async (req, res) => {
  try {
    const episodes = await prisma.episode.findMany({
      where: { status: "published" },
      orderBy: { publishDate: "desc" },
      include: { _count: { select: { listenLogs: true } } },
    });
    const mapped = episodes.map((e) => ({
      ...e,
      listenCount: e._count.listenLogs,
      _count: undefined,
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes/library — episodes the current user has listened to (auth required)
router.get("/library", authenticate, async (req, res) => {
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

    const mapped = episodes.map((e) => ({
      ...e,
      listenCount: e._count.listenLogs,
      lastListened: lastListened[e.id],
      _count: undefined,
    }));
    mapped.sort((a, b) => (b.lastListened > a.lastListened ? 1 : -1));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes/today — returns today's published episode (used by the user dashboard)
router.get("/today", async (req, res) => {
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

    res.json(episode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/episodes/:id — get a single episode by ID
router.get("/:id", async (req, res) => {
  try {
    const episode = await prisma.episode.findUnique({
      where: { id: req.params.id },
    });
    if (!episode) return res.status(404).json({ error: "Episode not found" });
    res.json(episode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/episodes/:id/listen — log that a user listened to an episode (auth required)
router.post("/:id/listen", authenticate, async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
