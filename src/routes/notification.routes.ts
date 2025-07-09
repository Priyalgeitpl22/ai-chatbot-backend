import { Router } from "express";
import {
  createAndUpdateNotification,
  getAllNotifications,
  clearNotificationCount,
  clearNotification,
} from "../controllers/notification.controller";
const router = Router();

router.post("/:orgId/notification", createAndUpdateNotification);
router.get("/:orgId", getAllNotifications);
router.post("/clear", clearNotificationCount);
router.delete("/:orgId/notification", clearNotification);

export default router;
