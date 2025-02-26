import { Router } from "express";
import { getAllThreads, searchThreads } from "../controllers/thread.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", getAllThreads);
router.get("/search", authMiddleware,searchThreads);

export default router;
