import { Router } from "express";

import { verifySuperAdmin } from "../middlewares/authMiddleware";
import { createCancelRequest, approveCancelRequest, getAllCancelRequests } from "../controllers/subscription.cancel.controller";


const router = Router();

router.post("/", createCancelRequest);
router.get("/", verifySuperAdmin, getAllCancelRequests);
router.post("/:id/approve", verifySuperAdmin, approveCancelRequest);

export default router;