import { Router } from "express";
import { getMessages ,markMessageReaded } from "../controllers/message.controller";

const router = Router();

router.get("/:threadId", getMessages);
router.patch("/:threadId/seen", markMessageReaded);

export default router;
