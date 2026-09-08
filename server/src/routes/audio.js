import { Router } from "express";
import { stream } from "../controllers/audioController.js";

const router = Router();

// Stream an audio file
router.get("/", stream);

export default router;
