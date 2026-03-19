import { BillingPeriod } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { getBillingPeriodEndDate } from "../helpers/subscription.helpers";
import { IUpdateOrganizationPlan } from "../models/organization.plan.model";

const prisma = new PrismaClient();

export const createOrganizationPlan = async (
  orgId: string,
  planId: number,
  billingPeriod: BillingPeriod
) => {
  return await prisma.organizationPlan.create({
    data: {
      orgId,
      planId,
      billingPeriod,
      isActive: true,
      startsAt: new Date(),
      endsAt: getBillingPeriodEndDate(billingPeriod),

      // AI BOT USAGE TRACKING
      userSessionsUsed: 0,
      agentsUsed: 0,
    },
  });
};

export const updateOrganizationPlan = async (
    id: number,
    data: IUpdateOrganizationPlan
  ) => {
  
    const existingPlan = await prisma.organizationPlan.findUnique({
      where: { id },
    });
  
    if (!existingPlan) {
      return { code: 400, message: "Organization plan not found" };
    }
  
    return await prisma.organizationPlan.update({
      where: { id },
      data: {
        planId: data.planId ?? existingPlan.planId,
        billingPeriod: data.billingPeriod ?? existingPlan.billingPeriod,
        isActive: data.isActive ?? existingPlan.isActive,
        startsAt: data.startsAt ?? existingPlan.startsAt,
        endsAt: data.endsAt ?? existingPlan.endsAt,
        stripeCustomerId:
          data.stripeCustomerId ?? existingPlan.stripeCustomerId,
        stripeSubscriptionId:
          data.stripeSubscriptionId ?? existingPlan.stripeSubscriptionId,
      },
    });
  };