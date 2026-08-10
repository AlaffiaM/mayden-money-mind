// Admin routes — dashboard stats, settings CRUD, users, episodes, subscriptions, notifications
// All routes in this file require admin authentication (middleware applied at top level)
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

// Apply auth + admin check to every route in this file
router.use(authenticate, requireAdmin);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);

router.get("/stats", getStats);

router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.delete("/users/:id", deleteUser);
router.post("/users/:id/override", overrideUser);

router.post("/episodes", upload.single("audio"), createEpisode);
router.put("/episodes/:id", upload.single("audio"), updateEpisode);
router.post("/episodes/:id/publish", publishEpisode);
router.delete("/episodes/:id", deleteEpisode);
router.post("/episodes/:id/stream", streamEpisode);
router.get("/episodes", listEpisodes);

router.get("/subscriptions", listSubscriptions);
router.get("/subscriptions/revenue", getRevenue);
router.post("/subscriptions/send-reminder", sendReminder);

router.get("/reports/utm", getUtmReport);
router.get("/payments/export", exportPayments);

router.get("/notifications", listNotifications);
router.post("/notifications", createNotification);
router.post("/notifications/test", testNotification);
router.delete("/notifications/:id", deleteNotification);
router.delete("/notifications", clearNotifications);

router.get("/audio-files", listAudioFiles);

export default router;
