import { Router } from "express";
import { getChatConfig, getChatScript, updateChatConfig ,chatThreadEmailTranscript} from "../controllers/chatConfig.controller";
import { endChat } from "../controllers/chatConfig.controller"
const router = Router();

router.get("/", getChatConfig);
router.post("/", updateChatConfig);
router.get("/script/:orgeId", getChatScript);
router.post('/end', endChat);
router.post('/chats/transcript',chatThreadEmailTranscript)

export default router;