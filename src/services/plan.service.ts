import { PlanCode, PrismaClient, Plan, OrganizationPlan, AddOnCode } from "@prisma/client";
import { CurrentPlanData } from "../interfaces";

const prisma = new PrismaClient();

const formatPlanResponse = (plan: Plan, orgPlan?: OrganizationPlan) => ({
  id: plan.id,
  name: plan.name,
  code: plan.code,
  description: plan.description,

  priceMonthly: plan.priceMonthly,
  priceYearly: plan.priceYearly,
  isContactSales: plan.isContactSales,

  // NEW LIMITS
  maxUserSessions: plan.maxUserSessions,
  maxDynamicData: plan.maxDynamicData,
  chatHistoryLimit: plan.chatHistoryLimit,
  maxAgents: plan.maxAgents,

  // FEATURES
  hasApiAccess: plan.hasApiAccess,
  hasCustomBranding: plan.hasCustomBranding,
  hasAnalytics: plan.hasAnalytics,
  hasPrioritySupport: plan.hasPrioritySupport,

  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,

  subscription: orgPlan
    ? {
        startsAt: orgPlan.startsAt,
        endsAt: orgPlan.endsAt,
        isActive: orgPlan.isActive,
      }
    : null,
});

export const formatCurrentPlanData = (currentPlan: any, addOns: any[],requestedAddOns: any[], subscriptionRequest: any): CurrentPlanData => {
  return {
    basePlan: {
      id: currentPlan.planId,
      code: currentPlan.plan?.code as PlanCode,
      name: currentPlan.plan?.name,

      maxUserSessions: currentPlan.plan?.maxUserSessions,
      maxDynamicData: currentPlan.plan?.maxDynamicData,
      chatHistoryLimit: currentPlan.plan?.chatHistoryLimit,
      maxAgents: currentPlan.plan?.maxAgents,

      sessionsUsedThisPeriod: currentPlan.sessionsUsedThisPeriod,
      dynamicDataUsedThisPeriod: currentPlan.dynamicDataUsedThisPeriod,
      agentsCount: currentPlan.agentsCount,

      startsAt: currentPlan.startsAt,
      endsAt: currentPlan.endsAt,
    
    },

    addOns:
      addOns.map((addOn: any) => {
        return {
          id: addOn.addOn.id,
          code: addOn.addOn.code as AddOnCode,
          name: addOn.addOn.name,

          extraUserSessions: addOn.addOn.extraUserSessions,

          usedThisPeriod: addOn.usedThisPeriod,
          periodStartsAt: addOn.periodStartsAt,
          periodEndsAt: addOn.periodEndsAt,
        };
      }) || [],
      subscriptionRequest,
      requestedAddOns
  };
};

export class PlanService {
  static async getAll() {
    const plans = await prisma.plan.findMany({ orderBy: { id: "asc" } });

    if (!plans || plans.length === 0) {
      return { code: 404, message: "No plans found" };
    }

    return { code: 200, message: "Plans fetched successfully", data: plans.map((plan) => formatPlanResponse(plan)) };
  }

  static async getByCode(code: string) {
    const plan = await prisma.plan.findUnique({ where: { code: code as PlanCode } });

    if (!plan) {
      return { code: 404, message: "Plan not found" };
    }

    return { code: 200, message: "Plan fetched successfully", data: formatPlanResponse(plan, undefined) };
  }

  static async getPlanByOrgId(orgId: string) {
    try {
      const subscription = await prisma.organizationPlan.findFirst({ where: { orgId, isActive: true }, include: { plan: true } });
      if (!subscription || !subscription.plan) {
        return null;
      }
      return formatPlanResponse(subscription.plan, subscription);
    } catch (err: any) {
      console.error(err);
      return null;
    }
  }
}
