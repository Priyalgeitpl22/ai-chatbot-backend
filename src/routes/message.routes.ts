import { Router } from "express";
import { getMessages ,markMessageReaded ,chatUploadFile} from "../controllers/message.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
const router = Router();

router.get("/:threadId",authMiddleware, getMessages);
router.patch("/:threadId/seen",authMiddleware ,markMessageReaded);
router.post("/upload",chatUploadFile)

export default router;
