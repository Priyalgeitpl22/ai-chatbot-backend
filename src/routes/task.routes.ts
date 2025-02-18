import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware"; 
import { createTask, getAllTasks } from "../controllers/task.controller";

const router = Router();

router.get("/tasks", getAllTasks);  

export default router;
