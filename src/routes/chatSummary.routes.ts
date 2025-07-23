import { Router } from "express";
import {createChatSummary,getChatSummary,getEndChatList} from "../controllers/chatSummary.controller"

const router = Router()

router.post("/:threadId/summary",createChatSummary)
router.get("/:threadId/summary",getChatSummary)
router.get("/:aiOrgId/list",getEndChatList)

export default router;
