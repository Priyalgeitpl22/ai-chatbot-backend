import { Router } from "express";
import { getOrganization, saveOrganization, updateOrganization } from "../controllers/organization.controller"

const router = Router();

router.get("/", getOrganization);
router.post("/", saveOrganization);
router.put("/", updateOrganization);

export default router;
