import { Router } from "express";
import { getChatConfig, getChatScript, updateChatConfig } from "../controllers/chatConfig.controller";

const router = Router();

router.get("/", getChatConfig);
router.post("/", updateChatConfig);
router.get("/script/:orgeId", getChatScript);

export default router;