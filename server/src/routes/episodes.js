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

// List episodes (public)
router.get("/", optionalAuth, list);
// Full library for subscribers
router.get("/library", authenticate, library);

// Saved episodes in my library
router.get("/my-library", authenticate, requireVerified, myLibrary);
// Today's episode
router.get("/today", optionalAuth, today);
// Episode details
router.get("/:id", getById);

// Stream an episode
router.post("/:id/stream", authenticate, requireVerified, stream);
// Log an episode listen
router.post("/:id/listen", authenticate, requireVerified, listen);

export default router;
