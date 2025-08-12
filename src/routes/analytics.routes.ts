import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authMiddleware, getAnalytics);

export default router; 