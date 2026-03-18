import { Router } from "express";
import {
  createAddonRequest,
  getAllAddOnRequests,
  approveAddOnRequest,
  rejectAddOnRequest
} from "../controllers/subscription.addon.controller";

const router = Router();

router.post("/", createAddonRequest);
router.get("/", getAllAddOnRequests);
router.post("/:id/approve", approveAddOnRequest);
router.post("/addon-request/:id/reject", rejectAddOnRequest);

export default router;