import { Router } from "express";

import { verifySuperAdmin } from "../middlewares/authMiddleware";
import { createAddOn } from "../controllers/add-on.controller";
import { approveAddOnRequest, getAllAddOnRequests } from "../controllers/subscription.addon.controller";

const router = Router();

router.post("/", createAddOn);
router.get("/", verifySuperAdmin, getAllAddOnRequests);
router.post("/:id/approve", verifySuperAdmin, approveAddOnRequest);

export default router;