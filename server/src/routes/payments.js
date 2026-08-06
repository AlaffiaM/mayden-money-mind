// Payment routes — Paystack payment initialization, verification, callback, and webhook
import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { initialize, verify, callback, webhook } from "../controllers/paymentController.js";

const router = Router();

router.post("/initialize", authenticate, initialize);
router.post("/verify", authenticate, verify);
router.get("/callback", callback);
router.post("/webhook", webhook);

export default router;
