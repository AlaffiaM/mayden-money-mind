// Subscription routes — user-facing subscription management (create, pause, cancel, check status)
import { Router } from "express";
import { authenticate, requireVerified } from "../middleware/auth.js";
import { getMine, getStatus, create, update, setAutoRenew } from "../controllers/subscriptionController.js";

const router = Router();

// Reading one's subscription (drives the protected dashboard/library access) requires
// a verified email. Creating/paying for a subscription stays open to unverified users
// so they can upgrade before (or while) confirming their email.
router.get("/mine", authenticate, requireVerified, getMine);
router.get("/mine/status", authenticate, requireVerified, getStatus);
router.post("/", authenticate, create);
router.patch("/:id", authenticate, update);
router.patch("/:id/auto-renew", authenticate, setAutoRenew);

export default router;
