// Protected audio streaming endpoint.
// GET /api/audio?file=<path>&exp=<ts>&sig=<hmac>
import { Router } from "express";
import { stream } from "../controllers/audioController.js";

const router = Router();

router.get("/", stream);

export default router;
