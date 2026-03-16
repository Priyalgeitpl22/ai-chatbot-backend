import { Router } from "express";
import { SubscriptionCancelController } from "../controllers/subscription.cancel.controller";

const router = Router();
const controller = new SubscriptionCancelController();

router.post("/", controller.createCancelRequest.bind(controller));
router.post("/:id/approve", controller.approveCancelRequest.bind(controller));
router.post("/:id/reject", controller.rejectCancelRequest.bind(controller));
router.get("/", controller.getCancelRequests.bind(controller));

export default router;