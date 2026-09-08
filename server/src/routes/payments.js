import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { initialize, verify, callback, webhook } from "../controllers/paymentController.js";

const router = Router();

// Initialize Paystack payment
router.post("/initialize", authenticate, initialize);
// Verify payment
router.post("/verify", authenticate, verify);
// Paystack redirect callback
router.get("/callback", callback);
// Paystack webhook
router.post("/webhook", webhook);

export default router;
