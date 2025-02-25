import { Router } from "express";
import { getAllTasks } from "../controllers/task.controller";

const router = Router();

router.get("/tasks", getAllTasks);  

export default router;
