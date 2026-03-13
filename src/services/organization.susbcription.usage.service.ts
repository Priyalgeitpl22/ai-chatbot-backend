import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Increment chat sessions usage
 */
export async function incrementUserSessions(orgId: string): Promise<void> {
  try {
    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

    // Sessions counted from Thread table
  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment sessions for org ${orgId}:`,
      error
    );
  }
}

/**
 * Increment dynamic data usage
 */
export async function incrementDynamicData(orgId: string): Promise<void> {
  try {
    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment dynamic data for org ${orgId}:`,
      error
    );
  }
}

/**
 * Increment agents count
 */
export async function incrementAgentCount(orgId: string): Promise<void> {
  try {
    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment agent count for org ${orgId}:`,
      error
    );
  }
}

/**
 * Get usage and limits for AI Bot
 */
export async function getUsageAndLimits(orgId: string) {

  const subscription = await prisma.organizationPlan.findFirst({
    where: { orgId, isActive: true },
    include: {
      plan: true,
      organization: true   // ✅ FIX
    },
  });

  if (!subscription?.plan) return null;

  const plan = subscription.plan;
  const aiOrgId = subscription.organization.aiOrgId;

  const [
    sessionsCount,
    dynamicDataCount,
    agentsCount
  ] = await Promise.all([

    prisma.thread.count({
      where: {
        aiOrgId: aiOrgId ?? undefined
      }
    }),

    prisma.dynamicData.count({
      where: { orgId }
    }),

    prisma.user.count({
      where: {
        orgId,
        deletedAt: null
      }
    })

  ]);

  return {
    subscription,
    plan,

    usage: {
      sessionsUsed: sessionsCount,
      dynamicDataUsed: dynamicDataCount,
      agentsUsed: agentsCount,
    },

    limits: {
      maxUserSessions: plan.maxUserSessions,
      maxDynamicData: plan.maxDynamicData,
      maxAgents: plan.maxAgents,
      chatHistoryLimit: plan.chatHistoryLimit,
    },
  };
}