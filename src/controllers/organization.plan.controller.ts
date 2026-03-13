import { Request, Response } from "express";
import { OrganizationPlanService } from "../services/organization.plan.service";
import * as OrganizationAddOnService from "../services/organization.add-on.service";
import { UserRoles } from "../enums";
import { AuthenticatedRequest } from "../types/request.types";

export const assignPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orgId } = req.params as any;
    const { planCode, addOns, billingPeriod } = req.body;
    const response = await OrganizationPlanService.assignPlan(orgId, planCode, addOns, billingPeriod);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to assign plan" });
  }
};

export const getCurrentPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orgId } = req.params as any;
    const response = await OrganizationPlanService.getCurrentPlan(orgId);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to get current plan" });
  }
};

export const contactSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any 
    const { planCode, billingPeriod, addOns, totalCost, name, email, phone, address } = req.body;

    if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
      res.status(401).json({ code: 401, message: "Only admin can contact sales" });
      return;
    }

    const response = await OrganizationPlanService.contactSales(
      { id: user.id, orgId: user.orgId, email: user.email, role: user.role },
      planCode,
      addOns,
      billingPeriod,
      totalCost,
      {
        name: name,
        email: email,
        phone: phone,
        address: address,
      }
    );
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to contact sales" });
  }
};

export const assignFreePlanToAllOrgs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const response = await OrganizationPlanService.assignFreePlanToAllOrgs();
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to assign free plan to all organizations" });
  }
};

export const activatePlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { planCode, orgId, billingPeriod } = req.body;
    const response = await OrganizationPlanService.activatePlan(orgId, planCode, billingPeriod);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to activate plan" });
  }
};

// --- Add-on (org-level) ---

export const assignAddOn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = (req.params as any).orgId ?? (req as any).user?.orgId;
    const { addOnCode, limitOverride } = req.body;
    if (!orgId || !addOnCode) {
      res.status(400).json({ code: 400, message: "orgId and addOnCode are required" });
      return;
    }
    const response = await OrganizationAddOnService.assignAddOnToOrg(orgId, addOnCode, { limitOverride });
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to assign add-on" });
  }
};

export const getOrgAddOns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = (req.params as any).orgId ?? (req as any).user?.orgId;
    if (!orgId) {
      res.status(400).json({ code: 400, message: "orgId is required" });
      return;
    }
    const response = await OrganizationAddOnService.getOrgAddOns(orgId);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to get add-ons" });
  }
};

export const getAddOnsAvailableForPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.params.orgId as any ?? (req.user as any)?.orgId;
    if (!orgId) {
      res.status(400).json({ code: 400, message: "orgId is required" });
      return;
    }
    const response = await OrganizationAddOnService.getAddOnsAvailableForCurrentPlan(orgId);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to get available add-ons" });
  }
};

export const getAllSubscriptionsRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const response = await OrganizationPlanService.getAllSubscriptionsRequests();
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to get all subscriptions" });
  }
};

export const getSubscriptionsByOrgId = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = (req.params as any).orgId;
    if (!orgId) {
      res.status(400).json({ code: 400, message: "orgId is required" });
      return;
    }
    const response = await OrganizationPlanService.getSubscriptionsByOrgId(orgId);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to get subscriptions for organization" });
  }
};

export const getAllSubscriptionsPerOrganization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const response = await OrganizationPlanService.getAllSubscriptionsPerOrganization();
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to get all subscriptions per organization" });
  }
};

export const activatePlanWithOfferToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orgId, offer } = req.body;
    const response = await OrganizationPlanService.activatePlanWithOfferToken(orgId, offer);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to activate plan with offer token" });
  }
};