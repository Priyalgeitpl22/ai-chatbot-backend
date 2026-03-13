import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Increment chat session usage (Thread created)
 */
export async function incrementUserSessions(orgId: string): Promise<void> {
  try {

    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        userSessionsUsed: {
          increment: 1,
        },
      },
    });

  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment sessions for org ${orgId}:`,
      error
    );
  }
}

/**
 * Increment dynamic API usage
 */
export async function incrementDynamicData(orgId: string): Promise<void> {
  try {

    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        dynamicDataUsed: {
          increment: 1,
        },
      },
    });

  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment dynamic data for org ${orgId}:`,
      error
    );
  }
}

/**
 * Increment agent count
 */
export async function incrementAgentCount(orgId: string): Promise<void> {
  try {

    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        agentsUsed: {
          increment: 1,
        },
      },
    });

  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment agent count for org ${orgId}:`,
      error
    );
  }
}

/**
 * Increment message usage
 */
export async function incrementMessages(orgId: string): Promise<void> {
  try {

    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
    });

    if (!activePlan) return;

    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        messagesUsed: {
          increment: 1,
        },
      },
    });

  } catch (error) {
    console.error(
      `[OrganizationUsageService] Failed to increment messages for org ${orgId}:`,
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
      organization: true,
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
        aiOrgId: aiOrgId ?? undefined,
      },
    }),

    prisma.dynamicData.count({
      where: { orgId },
    }),

    prisma.user.count({
      where: {
        orgId,
        deletedAt: null,
      },
    }),

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