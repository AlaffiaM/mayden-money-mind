// Subscription routes — user-facing subscription management (create, pause, cancel, check status)
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { getMine, getStatus, create, update } from "../controllers/subscriptionController.js";

const router = Router();

router.get("/mine", authenticate, getMine);
router.get("/mine/status", authenticate, getStatus);
router.post("/", authenticate, create);
router.patch("/:id", authenticate, update);

export default router;
