// Episode routes — public listing, today's episode, and listen logging
import { Router } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  list,
  library,
  today,
  getById,
  listen,
  stream,
} from "../controllers/episodeController.js";

const router = Router();

router.get("/", optionalAuth, list);
router.get("/library", authenticate, library);
router.get("/today", optionalAuth, today);
router.get("/:id", getById);
router.post("/:id/stream", authenticate, stream);
router.post("/:id/listen", authenticate, listen);

export default router;
