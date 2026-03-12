import { Router } from "express";
import { assignPlan, contactSales, getCurrentPlan, assignFreePlanToAllOrgs, activatePlan, assignAddOn, getOrgAddOns, getAddOnsAvailableForPlan, getSubscriptionsByOrgId, getAllSubscriptionsPerOrganization, activatePlanWithOfferToken } from "../controllers/organization.plan.controller";
import { authMiddleware } from "../middlewares/authMiddleware";


const router = Router();

router.get("/subscriptions/by-organization", getAllSubscriptionsPerOrganization);

router.post("/:orgId/plan/assign", assignPlan);
router.get("/:orgId/plan/current", authMiddleware, getCurrentPlan);
router.get("/:orgId/subscriptions", authMiddleware, getSubscriptionsByOrgId);

router.post("/contact-sales", authMiddleware, contactSales);
router.post("/assign-free-plan-to-all-orgs", assignFreePlanToAllOrgs);
router.post("/activate", activatePlan);

// Org-level add-ons (e.g. when on Starter and picking add-on)
router.get("/:orgId/add-ons", authMiddleware, getOrgAddOns);
router.get("/:orgId/add-ons/available", authMiddleware, getAddOnsAvailableForPlan);
router.post("/:orgId/add-ons", authMiddleware, assignAddOn);
router.post("/activate-offer-plan", authMiddleware, activatePlanWithOfferToken);

export default router;
