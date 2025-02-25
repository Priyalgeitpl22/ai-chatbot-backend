import { Router } from "express";
import { getAllThreads } from "../controllers/thread.controller";

const router = Router();

router.get("/", getAllThreads);

export default router;
