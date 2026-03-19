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

  // ✅ LIMITS
  maxUserSessions: plan.maxUserSessions,
  maxAgents: plan.maxAgents,

  // ✅ FEATURES (IMPORTANT — ADD ALL)
  hasAiChat: plan.hasAiChat,
  hasCustomBranding: plan.hasCustomBranding,
  hasApiAccess: plan.hasApiAccess,
  hasRealtimeApiData: plan.hasRealtimeApiData,
  hasSupportTickets: plan.hasSupportTickets,

  createdAt: plan.createdAt,
  updatedAt: plan.updatedAt,

});
export const formatCurrentPlanData = (currentPlan: any, subscriptionRequest: any): CurrentPlanData => {
  return {
    basePlan: {
      id: currentPlan.planId,
      code: currentPlan.plan?.code as PlanCode,
      name: currentPlan.plan?.name,

      maxUserSessions: currentPlan.plan?.maxUserSessions,
      maxAgents: currentPlan.plan?.maxAgents,

      sessionsUsedThisPeriod: currentPlan.sessionsUsedThisPeriod,
      agentsCount: currentPlan.agentsCount,

      startsAt: currentPlan.startsAt,
      endsAt: currentPlan.endsAt,
    
    },

  
      subscriptionRequest,
  };
};

export class PlanService {
  static async getAll() {
    const plans = await prisma.plan.findMany({ orderBy: { id: "asc" } });

    if (!plans || plans.length === 0) {
      return { code: 200, message: "No plans found",data : [] };
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
