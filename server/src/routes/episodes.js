// Episode routes — public listing, today's episode, and listen logging
import { Router } from "express";
import { authenticate, optionalAuth, requireVerified } from "../middleware/auth.js";
import {
  list,
  library,
  myLibrary,
  today,
  getById,
  listen,
  stream,
} from "../controllers/episodeController.js";

const router = Router();

router.get("/", optionalAuth, list);
router.get("/library", authenticate, library);
// Personal, private listening library — requires a verified email but NOT an
// active subscription (expired subscribers may still view their saved history;
// playback stays gated through /stream). Must be declared before /:id.
router.get("/my-library", authenticate, requireVerified, myLibrary);
router.get("/today", optionalAuth, today);
router.get("/:id", getById);
// Playback and listen-recording are protected content: require a verified email.
router.post("/:id/stream", authenticate, requireVerified, stream);
router.post("/:id/listen", authenticate, requireVerified, listen);

export default router;
