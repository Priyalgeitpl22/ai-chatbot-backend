import { Router } from "express";
import { getAllThreads, searchThreads ,assignThread ,markThreadReaded,createChatOrTicket} from "../controllers/thread.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();
router.post("/chat", createChatOrTicket);
router.get("/", getAllThreads);
router.get("/search", authMiddleware,searchThreads);
router.patch("/:threadId/assign",assignThread)
router.patch("/:threadId/readed",markThreadReaded);

export default router;
