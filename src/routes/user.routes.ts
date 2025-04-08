import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { getAuthUser, getUsers, updateUser,getUserSettings,saveUserSettings } from "../controllers/user.controller";

const router = Router();

router.get("/", authMiddleware, getAuthUser);
router.get("/users",authMiddleware, getUsers);
router.put("/", updateUser);
router.get('/user-settings/:userId', getUserSettings);
router.post("/user-settings", saveUserSettings);

export default router;
