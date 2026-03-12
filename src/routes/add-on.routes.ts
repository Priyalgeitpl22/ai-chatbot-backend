import { Router } from "express";
import {
  getAllAddOns,
  getAddOnById,
  getAddOnByCode,
  createAddOn,
  updateAddOn,
  deleteAddOn,
  getAddOnPlans,
  setAddOnPlans,
} from "../controllers/add-on.controller";
import { authMiddleware } from "../middlewares/authMiddleware";


const router = Router();

// List all add-ons (public or protected - using verify for consistency)
router.get("/", getAllAddOns);
// 1

// Get by code (must be before /:id)
router.get("/code/:code", getAddOnByCode);
// 1

// Plan links for an add-on
router.get("/:id/plans", getAddOnPlans);
router.put("/:id/plans", authMiddleware, setAddOnPlans);

// CRUD by id
router.get("/:id", getAddOnById);
router.post("/", authMiddleware, createAddOn);
router.put("/:id", authMiddleware, updateAddOn);
router.delete("/:id", authMiddleware, deleteAddOn);

export default router;
