import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { upload } from "../services/audioStorageService.js";
import {
  getSettings,
  updateSettings,
  getStats,
  listUsers,
  getUser,
  deleteUser,
  overrideUser,
  createEpisode,
  createEpisodesBatch,
  updateEpisode,
  publishEpisode,
  deleteEpisode,
  listEpisodes,
  streamEpisode,
  listSubscriptions,
  getRevenue,
  sendReminder,
  getUtmReport,
  exportPayments,
  listNotifications,
  createNotification,
  testNotification,
  deleteNotification,
  clearNotifications,
  listAudioFiles,
} from "../controllers/adminController.js";

const router = Router();

router.use(authenticate, requireAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

// Stats
router.get("/stats", getStats);

// User management
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/override", overrideUser);

// Episode management
router.post("/episodes", upload.single("audio"), createEpisode);
router.post("/episodes/batch", createEpisodesBatch);
router.put("/episodes/:id", upload.single("audio"), updateEpisode);
router.post("/episodes/:id/publish", publishEpisode);
router.delete("/episodes/:id", deleteEpisode);
router.post("/episodes/:id/stream", streamEpisode);
router.get("/episodes", listEpisodes);

// Subscriptions & revenue
router.get("/subscriptions", listSubscriptions);
router.get("/subscriptions/revenue", getRevenue);
router.post("/subscriptions/send-reminder", sendReminder);

// Reports & exports
router.get("/reports/utm", getUtmReport);
router.get("/payments/export", exportPayments);

// Notifications
router.get("/notifications", listNotifications);
router.post("/notifications", createNotification);
router.post("/notifications/test", testNotification);
router.delete("/notifications/:id", deleteNotification);
router.delete("/notifications", clearNotifications);

// Audio files served publicly
router.get("/audio-files", listAudioFiles);

export default router;
