import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import agentRoutes from "./agent.routes";
import organizationRoutes from "./organization.routes";
import taskRoutes from "./task.routes";
import messageRoutes from "./message.routes";
import threadRoutes from "./thread.routes";
import chatConfigRoutes from "./chatConfig.routes";
import faqRoutes from "./faq.routes";
import analyticsRoutes from "./analytics.routes";
import { authMiddleware } from "../middlewares/authMiddleware";
import securityRoutes from './security.route';
import notificatioRoute from "../routes/notification.routes";
import chatSummary from "./chatSummary.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", authMiddleware, userRoutes);
router.use("/org", authMiddleware, organizationRoutes);
router.use("/task", authMiddleware, taskRoutes);
router.use("/agent", authMiddleware, agentRoutes);
router.use("/message", messageRoutes);
router.use("/thread", authMiddleware,  threadRoutes);
router.use("/faq", authMiddleware, faqRoutes );
router.use("/chat/config", chatConfigRoutes);
router.use('/security', securityRoutes);
router.use("/notification",notificatioRoute)
router.use("/chat/analyze",chatSummary)
router.use("/analytics", analyticsRoutes);

export default router;
