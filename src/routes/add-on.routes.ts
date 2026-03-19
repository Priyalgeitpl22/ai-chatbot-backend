import { Router } from "express";

import { authMiddleware } from "../middlewares/authMiddleware";
import { approveAddOnRequest, createAddonRequest, getAllAddOnRequests, rejectAddOnRequest } from "../controllers/subscription.addon.controller";
import { getAllAddOns, getAddOnById, createAddOn, updateAddOn, deleteAddOn, getAddOnByCode } from "../controllers/add-on.controller";


const router = Router();

// List all add-ons (public or protected - using verify for consistency)
router.get("/", getAllAddOns);
// 1

// Get by code (must be before /:id)
// router.get("/code/:code", getAddOnByCode);

router.post("/request", authMiddleware ,createAddonRequest);
router.get("/request",authMiddleware, getAllAddOnRequests);
router.post("/:id/approve",authMiddleware, approveAddOnRequest);
router.post("/request/:id/reject", authMiddleware,rejectAddOnRequest);
// 1


// // CRUD by id
// router.get("/:id", getAddOnById);
// router.post("/", authMiddleware, createAddOn);
router.put("/:id", authMiddleware, updateAddOn);
router.delete("/:id", authMiddleware, deleteAddOn);

export default router;
