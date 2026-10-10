import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import {
  getPreferences,
  updatePreferences,
} from "../controllers/accountController.js";

const router = Router();

router.get("/preferences", authenticate, getPreferences);
router.patch(
  "/preferences",
  authenticate,
  [
    body("dailyListeningReminderEnabled")
      .isBoolean()
      .withMessage("Choose whether to receive daily listening reminders")
      .toBoolean(),
  ],
  updatePreferences,
);

export default router;
