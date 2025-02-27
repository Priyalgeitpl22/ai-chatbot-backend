import { Router } from "express";
import { getAllTasks , assignTask} from "../controllers/task.controller";

const router = Router();

router.get("/tasks", getAllTasks);  
router.patch("/tasks/:id/assign", assignTask);

export default router;
