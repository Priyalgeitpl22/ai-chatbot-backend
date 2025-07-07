import { Router } from "express";
import { getAllTasks , assignTask, getUnreadTicketCount, markTaskAsResolved } from "../controllers/task.controller";

const router = Router();

router.get("/tasks", getAllTasks);  
router.patch("/tasks/:id/assign", assignTask);
router.get("/unread/:orgId", getUnreadTicketCount);
router.patch("/tasks/:id/resolve", markTaskAsResolved);

export default router;
