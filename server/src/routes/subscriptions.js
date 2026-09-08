
import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.js";
import { getMine, getStatus, create, update, setAutoRenew } from "../controllers/subscriptionController.js";

const router = Router();




router.get("/mine", authenticate, requireVerified, getMine);
router.get("/mine/status", authenticate, requireVerified, getStatus);
router.post("/", authenticate, create);
router.patch("/:id", authenticate, update);
router.patch("/:id/auto-renew", authenticate, setAutoRenew);

export default router;
