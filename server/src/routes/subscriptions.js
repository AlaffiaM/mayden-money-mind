import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.js";
import { getMine, getStatus, create, update, setAutoRenew } from "../controllers/subscriptionController.js";

const router = Router();

// My subscription
router.get("/mine", authenticate, requireVerified, getMine);
// Subscription status
router.get("/mine/status", authenticate, requireVerified, getStatus);
// Start a subscription
router.post("/", authenticate, create);
// Update plan or addon
router.patch("/:id", authenticate, update);
// Toggle auto-renew
router.patch("/:id/auto-renew", authenticate, setAutoRenew);

export default router;
