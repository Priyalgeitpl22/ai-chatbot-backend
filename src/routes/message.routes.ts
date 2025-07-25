import { Router } from "express";
import { getMessages ,markMessageReaded ,chatUploadFile, getChatPersistMessages} from "../controllers/message.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
const router = Router();

router.get("/:threadId",authMiddleware, getMessages);
router.patch("/:threadId/seen",authMiddleware ,markMessageReaded);
router.post("/upload",chatUploadFile)
router.get("/chat-persist/:threadId", getChatPersistMessages);


export default router;
