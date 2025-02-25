import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { getAuthUser, getUsers, updateUser } from "../controllers/user.controller";

const router = Router();

router.get("/", authMiddleware, getAuthUser);
router.get("/users",authMiddleware, getUsers);
router.put("/", updateUser);

export default router;
