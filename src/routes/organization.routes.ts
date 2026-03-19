import { Router } from "express";
import { getOrganization, saveOrganization, updateOrganization,verifyEmail,createAISettings,getAISettings } from "../controllers/organization.controller"
import { enforcePlanLimits } from "../middlewares/enforcePlanLimits";

const router = Router();

router.get("/", getOrganization);
router.post("/", saveOrganization);
router.put("/", enforcePlanLimits ,updateOrganization);
router.post("/settings/ai", createAISettings);
router.put("/settings/ai", createAISettings);
router.get("/settings/ai", getAISettings);
router.post("/verify-email", verifyEmail);

export default router;
