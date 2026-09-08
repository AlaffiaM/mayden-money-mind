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

router.get("/my-library", authenticate, requireVerified, myLibrary);
router.get("/today", optionalAuth, today);
router.get("/:id", getById);

router.post("/:id/stream", authenticate, requireVerified, stream);
router.post("/:id/listen", authenticate, requireVerified, listen);

export default router;
