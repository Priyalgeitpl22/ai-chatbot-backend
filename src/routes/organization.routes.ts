import { Router } from "express";
import { getOrganization, saveOrganization, updateOrganization,verifyEmail,createAISettings,getAISettings } from "../controllers/organization.controller"

const router = Router();

router.get("/", getOrganization);
router.post("/", saveOrganization);
router.put("/", updateOrganization);
router.post("/settings/ai", createAISettings);
router.put("/settings/ai", createAISettings);
router.get("/settings/ai", getAISettings);
router.post("/verify-email", verifyEmail);

export default router;
