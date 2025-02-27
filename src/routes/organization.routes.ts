import { Router } from "express";
import { getOrganization, saveOrganization, updateOrganization,verifyEmail } from "../controllers/organization.controller"

const router = Router();

router.get("/", getOrganization);
router.post("/", saveOrganization);
router.put("/", updateOrganization);
router.post("/verify-email", verifyEmail);

export default router;
