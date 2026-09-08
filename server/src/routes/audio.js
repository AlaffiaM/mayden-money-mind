

import { Router } from "express";
import { stream } from "../controllers/audioController.js";

const router = Router();

router.get("/", stream);

export default router;
