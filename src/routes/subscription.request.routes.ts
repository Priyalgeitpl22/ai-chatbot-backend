import { Router } from "express";
import { verifySuperAdmin } from "../middlewares/authMiddleware";
import { approveSubscriptionRequest, getAllSubscriptionRequests } from "../controllers/subscription.request.controller";

const router = Router();

router.get("/", verifySuperAdmin, getAllSubscriptionRequests);
router.post("/:id/approve", verifySuperAdmin, approveSubscriptionRequest);

export default router;  