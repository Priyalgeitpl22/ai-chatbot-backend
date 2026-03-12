import { AddOnCode, PlanCode, PrismaClient } from "@prisma/client";
import { subscriptionActivationEmail } from "./subscription.email.service";
import * as OrganizationAddOnService from "./organization.add-on.service"
import { formatCurrentPlanData } from "./plan.service";
import { ConfigurationService } from "./consfiguration.service";


const prisma = new PrismaClient();
export class OrganizationPlanService {

  static async assignPlan(orgId: string, planCode: string, addOns: AddOnCode[], billingPeriod: string) {
    if (!orgId || !planCode || !billingPeriod) {
      return { code: 400, message: "All fields (orgId, planCode, billingPeriod) are required" };
    }

    const plan = await prisma.plan.findUnique({ where: { code: planCode as PlanCode } });
    if (!plan) return { code: 400, message: "Plan not found" };
    const addOnCodes = addOns.map((a) => a as AddOnCode);
    const addOnsData = await prisma.addOn.findMany({ where: { code: { in: addOnCodes } } });
    if (addOnsData.length !== addOns.length) {
      return { code: 400, message: "Invalid add-ons: one or more add-on codes not found" };
    }

    const now = new Date();
    const endsAt =
      billingPeriod === "YEARLY"
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : billingPeriod === "MONTHLY"
          ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          : null;

    const existingPlan = await prisma.organizationPlan.findFirst({ where: { orgId }, include: { plan: true } });

    if (plan.id !== existingPlan?.planId) {
      return { code: 400, message: "No such plan request found. Please contact support." };
    }

    if (plan.code === existingPlan?.plan?.code && existingPlan?.isActive) {
      return { code: 400, message: "Plan already assigned to this organization. Please contact support." };
    }

    const existingAddOns = await prisma.organizationAddOn.findMany({ where: { orgId } });

    if (existingAddOns.length !== addOnsData.length) {
      return { code: 400, message: "No such add-ons found. Please contact support." };
    }

    for (const addOn of addOnsData) {
      const existingAddOn = existingAddOns.find((a) => a.addOnId === addOn.id);
      if (existingAddOn) {
        await prisma.organizationAddOn.update({
          where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
          data: { isActive: true, periodStartsAt: now, periodEndsAt: endsAt },
        });
      } else {
        await prisma.organizationAddOn.create({
          data: { orgId, addOnId: addOn.id, isActive: true, periodStartsAt: now, periodEndsAt: endsAt },
        });
      }
    }

    let organizationPlan;
    if (existingPlan) {
      organizationPlan = await prisma.organizationPlan.update({
        where: { id: existingPlan.id },
        data: {
          planId: plan.id,
          billingPeriod: billingPeriod as "MONTHLY" | "YEARLY",
          isActive: true,
          startsAt: now,
          endsAt,
          // emailsSentThisPeriod: 0,
          // leadsAddedThisPeriod: 0,
          // senderAccountsCount: 0,
          reminder15Sent: false,
          reminder10Sent: false,
          reminder5Sent: false,
          reminder1Sent: false,
        },
      });
    } else {
      organizationPlan = await prisma.organizationPlan.create({
        data: {
          orgId,
          planId: plan.id,
          billingPeriod: billingPeriod as "MONTHLY" | "YEARLY",
          isActive: true,
          startsAt: now,
          endsAt,
        },
      });
    }

    return { code: 200, message: "Plan assigned successfully", data: organizationPlan };
  }

  static async assignFreePlan(orgId: string) {
    try {
      const organization = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!organization) return { code: 400, message: "Organization not found" };

      const plan = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
      if (!plan) return { code: 400, message: "Plan not found" };

      const organizationPlan = await prisma.organizationPlan.create({
        data: {
          orgId,
          planId: plan.id,
          billingPeriod: "MONTHLY",
          isActive: true,
          startsAt: new Date(),
          endsAt: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          reminder15Sent: false,
          reminder10Sent: false,
          reminder5Sent: false,
          reminder1Sent: false,
        }
      });
      return { code: 200, message: "Free plan assigned successfully", data: organizationPlan };
    } catch (error: any) {
      return { code: 500, message: "Failed to assign free plan", error: error.message };
    }
  }

  static async downgradeToFreePlan(orgId: string): Promise<{ code: number; message: string; data?: any }> {
    try {
      const organization = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!organization) return { code: 404, message: "Organization not found" };

      const freePlan = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
      if (!freePlan) return { code: 500, message: "FREE plan not found" };

      const currentPlan = await prisma.organizationPlan.findFirst({
        where: { orgId, isActive: true },
        include: { plan: true },
      });
      if (!currentPlan) return { code: 400, message: "No active plan found" };
      if (currentPlan.plan.code === PlanCode.FREE) {
        return { code: 200, message: "Already on FREE plan", data: currentPlan };
      }

      await prisma.$transaction([
        prisma.organizationPlan.update({
          where: { id: currentPlan.id },
          data: { isActive: false },
        }),
        prisma.organizationPlan.create({
          data: {
            orgId,
            planId: freePlan.id,
            billingPeriod: "MONTHLY",
            isActive: true,
            startsAt: new Date(),
            endsAt: null,
            reminder15Sent: false,
            reminder10Sent: false,
            reminder5Sent: false,
            reminder1Sent: false,
          },
        }),
      ]);

      const newPlan = await prisma.organizationPlan.findFirst({
        where: { orgId, isActive: true },
        include: { plan: true },
      });
      return { code: 200, message: "Downgraded to FREE plan", data: newPlan };
    } catch (error: any) {
      return { code: 500, message: `Failed to downgrade to free plan: ${error?.message ?? error}` };
    }
  }

  static async getCurrentPlan(orgId: string) {
    const currentPlan = await prisma.organizationPlan.findFirst({
      where: { orgId },
      include: { plan: true },
    });

    if (!currentPlan) {
      return { code: 400, message: "No plan assigned to this organization" };
    }

    const orgAddOnsResult = await OrganizationAddOnService.getOrgAddOns(orgId);
    const addOns = orgAddOnsResult.code === 200 ? (orgAddOnsResult.data ?? []) : [];

    const currentPlanData = formatCurrentPlanData(currentPlan, addOns);
    return {
      code: 200,
      message: "Current plan fetched successfully",
      data: currentPlanData
    };
  }

  static async contactSales(
    user: { orgId: string; email: string; role: string },
    planCode: string,
    addOns: { name: string; code: string }[],
    billingPeriod: string,
    totalCost: number
  ) {
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return { code: 401, message: "Only admin can change the subscription plan" };
    }

    if (!planCode || !billingPeriod || !addOns || totalCost == null) {
      return { code: 400, message: "All fields (planCode, billingPeriod, addOns, totalCost) are required" };
    }

    const plan = await prisma.plan.findUnique({ where: { code: planCode as PlanCode } });
    const addOnCodes = addOns.map((a) => a.code as AddOnCode);
    const addOnsData = await prisma.addOn.findMany({ where: { code: { in: addOnCodes } } });
    if (addOnsData.length !== addOns.length) {
      return { code: 400, message: "Invalid add-ons: one or more add-on codes not found" };
    }

    const organization = await prisma.organization.findUnique({ where: { id: user.orgId } });
    if (!organization) return { code: 400, message: "Organization not found" };
    if (!plan) return { code: 400, message: "Plan not found" };

    await subscriptionActivationEmail(planCode, billingPeriod, addOns, organization.name || "", user.email || "", totalCost);

    const existingPlan = await prisma.organizationPlan.findFirst({ where: { orgId: user.orgId } });
    if (existingPlan) {
      await prisma.organizationPlan.update({
        where: { id: existingPlan.id },
        data: { planId: plan.id, billingPeriod: billingPeriod as "MONTHLY" | "YEARLY", isActive: false },
      });
    } else {
      await prisma.organizationPlan.create({
        data: { orgId: user.orgId, planId: plan.id, billingPeriod: billingPeriod as "MONTHLY" | "YEARLY", isActive: false },
      });
    }

    // Deactivate all existing org add-ons (pending subscription change)
    const existingAddOns = await prisma.organizationAddOn.findMany({ where: { orgId: user.orgId } });
    for (const orgAddOn of existingAddOns) {
      await prisma.organizationAddOn.update({
        where: { orgId_addOnId: { orgId: user.orgId, addOnId: orgAddOn.addOnId } },
        data: { isActive: false },
      });
    }

    // Upsert requested add-ons as inactive (to be activated after payment)
    for (const addOn of addOnsData) {
      await prisma.organizationAddOn.upsert({
        where: { orgId_addOnId: { orgId: user.orgId, addOnId: addOn.id } },
        create: { orgId: user.orgId, addOnId: addOn.id, isActive: false },
        update: { isActive: false },
      });
    }

    return { code: 200, message: "Email sent successfully" };
  }

  static async assignFreePlanToAllOrgs() {
    const organizations = await prisma.organization.findMany();
    for (const organization of organizations) {
      await this.assignPlan(organization.id, PlanCode.FREE, [], "MONTHLY");
    }
    return { code: 200, message: "Free plan assigned to all organizations" };
  }

  static async activatePlan(orgId: string, planCode: string, billingPeriod: string) {

    if (!orgId || !planCode || !billingPeriod) {
      return { code: 400, message: "All fields (orgId, planCode, billingPeriod) are required" };
    }

    if (billingPeriod !== "MONTHLY" && billingPeriod !== "YEARLY") {
      return { code: 400, message: "Invalid billing period" };
    }

    if (planCode !== PlanCode.FREE && planCode !== PlanCode.STARTER && planCode !== PlanCode.ENTERPRISE) {
      return { code: 400, message: "Invalid plan code" };
    }

    const organization = await prisma.organization.findUnique({ where: { id: orgId }, include: { plans: true } });
    if (!organization) return { code: 400, message: "Organization not found" };

    if (organization.plans.length === 0) {
      return { code: 400, message: "No plan requested for this organization. Please contact support." };
    }

    const plan = await prisma.plan.findUnique({ where: { code: planCode as PlanCode } });
    if (!plan) return { code: 400, message: "Plan not found" };

    if (organization.plans.some((orgPlan) => orgPlan.planId === plan.id && orgPlan.isActive)) {
      return { code: 400, message: "Plan already assigned to this organization" };
    }

    if (organization.plans.some((orgPlan) => orgPlan.planId !== plan.id && !orgPlan.isActive)) {
      return { code: 400, message: "No such plan request found. Please contact support." };
    }

    await prisma.organizationPlan.update({
      where: {
        orgId_isActive: { orgId, isActive: false }
      },
      data: {
        planId: plan.id,
        isActive: true, billingPeriod: billingPeriod as "MONTHLY" | "YEARLY",
        startsAt: new Date(),
        endsAt: billingPeriod === "MONTHLY" ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        reminder15Sent: false,
        reminder10Sent: false,
        reminder5Sent: false,
        reminder1Sent: false,
      }
    });

    const existingAddOns = await prisma.organizationAddOn.findMany({ where: { orgId } });
    for (const orgAddOn of existingAddOns) {
      await prisma.organizationAddOn.update({
        where: { orgId_addOnId: { orgId, addOnId: orgAddOn.addOnId } },
        data: { isActive: true, periodStartsAt: new Date(), periodEndsAt: billingPeriod === "MONTHLY" ? new Date(new Date().setMonth(new Date().getMonth() + 1)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
      });
    }

    return { code: 200, message: "Plan activated successfully" };
  }

  static async getAllSubscriptionsRequests() {
    const subscriptions = await prisma.organizationPlan.findMany({ where: { isActive: false } });
    return { code: 200, message: "All subscriptions requests fetched successfully", data: subscriptions };
  }

  /** All subscriptions (active + inactive) for a single organization, newest first. Includes org add-ons. */
  static async getSubscriptionsByOrgId(orgId: string) {
    const [subscriptions, orgAddOnsResult] = await Promise.all([
      prisma.organizationPlan.findMany({
        where: { orgId },
        include: { plan: true },
        orderBy: { startsAt: "desc" },
      }),
      OrganizationAddOnService.getOrgAddOns(orgId),
    ]);
    const addOns = orgAddOnsResult.code === 200 ? (orgAddOnsResult.data ?? []) : [];
    const subscriptionList = subscriptions.map((s : any) => ({
      id: s.id,
      orgId: s.orgId,
      planId: s.planId,
      plan: s.plan ? { id: s.plan.id, code: s.plan.code, name: s.plan.name } : null,
      billingPeriod: s.billingPeriod,
      isActive: s.isActive,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      emailsSentThisPeriod: s.emailsSentThisPeriod,
      leadsAddedThisPeriod: s.leadsAddedThisPeriod,
      senderAccountsCount: s.senderAccountsCount,
      stripeCustomerId: s.stripeCustomerId,
      stripeSubscriptionId: s.stripeSubscriptionId,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    return {
      code: 200,
      message: "Subscriptions fetched successfully",
      data: subscriptionList,
      addOns,
    };
  }

  /** All subscriptions grouped by organization (for admin). Includes add-ons per org. */
  static async getAllSubscriptionsPerOrganization() {
    const [subscriptions, allOrgAddOns] = await Promise.all([
      prisma.organizationPlan.findMany({
        include: { plan: true, organization: { select: { id: true, name: true } } },
        orderBy: [{ orgId: "asc" }, { startsAt: "desc" }],
      }),
      prisma.organizationAddOn.findMany({
        include: { addOn: true },
      }),
    ]);
    const addOnsByOrg = new Map<string, any[]>();
    for (const row of allOrgAddOns) {
      const limit = row.limitOverride ?? row.addOn.extraUserSessions ?? null;
      const entry = {
        addOn: row.addOn,
        isActive: row.isActive,
        limitOverride: row.limitOverride,
        effectiveLimit: limit,
        usedThisPeriod: row.usedThisPeriod,
        remainingThisPeriod: limit != null ? Math.max(0, limit - row.usedThisPeriod) : null,
        periodStartsAt: row.periodStartsAt,
        periodEndsAt: row.periodEndsAt,
      };
      if (!addOnsByOrg.has(row.orgId)) addOnsByOrg.set(row.orgId, []);
      addOnsByOrg.get(row.orgId)!.push(entry);
    }
    const byOrg = new Map<
      string,
      { orgId: string; orgName: string | null; subscriptions: typeof subscriptions }
    >();
    for (const s of subscriptions) {
      if (!byOrg.has(s.orgId)) {
        byOrg.set(s.orgId, {
          orgId: s.orgId,
          orgName: s.organization?.name ?? null,
          subscriptions: [],
        });
      }
      byOrg.get(s.orgId)!.subscriptions.push(s);
    }
    const data = Array.from(byOrg.values()).map(({ orgId, orgName, subscriptions: subs }) => ({
      orgId,
      orgName,
      subscriptions: subs.map((s) => ({
        id: s.id,
        planId: s.planId,
        plan: s.plan ? { id: s.plan.id, code: s.plan.code, name: s.plan.name } : null,
        billingPeriod: s.billingPeriod,
        billingAmount: s.billingPeriod === "MONTHLY" ? s.plan?.priceMonthly ?? 0 : s.plan?.priceYearly ?? 0,
        isActive: s.isActive,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        createdAt: s.createdAt,
      })),
      addOns: addOnsByOrg.get(orgId) ?? [],
    }));
    return {
      code: 200,
      message: "All subscriptions per organization fetched successfully",
      data,
    };
  }

  static async activatePlanWithOfferToken(orgId: string, offerToken: string) {
    try {
      const offer = await ConfigurationService.getSubscriptionOfferByToken(offerToken);
      if (!offer) return { code: 400, message: "Invalid offer token" };

      const organization = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!organization) return { code: 400, message: "Organization not found" };

      const existingPlan = await prisma.organizationPlan.findFirst({ where: { orgId } });

      if (existingPlan) {
        await prisma.organizationPlan.delete({ where: { id: existingPlan.id } });
      }

      const newPlan = await prisma.organizationPlan.create({
        data: {
          orgId,
          planId: 2, // STARTER plan
          isActive: true,
          billingPeriod: offer.monthsFree ? "MONTHLY" : "YEARLY",
          startsAt: new Date(),
          endsAt: offer.monthsFree ? new Date(new Date().setMonth(new Date().getMonth() + offer.monthsFree)) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        }
      });

      return { code: 200, message: "Plan activated successfully", data: newPlan };
    } catch (error: any) {
      console.error(error);
      return { code: 500, message: "Failed to activate plan with offer token", error: error.message };
    }
  }
}
