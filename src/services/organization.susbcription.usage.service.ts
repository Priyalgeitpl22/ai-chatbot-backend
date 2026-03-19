import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export async function incrementUserSessions(orgId: string): Promise<void> {
  try {
    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
      include: { plan: true },
    });

    if (!activePlan || !activePlan.plan) return;

    const { userSessionsUsed, plan } = activePlan;

    // ✅ LIMIT CHECK
    if (
      plan.maxUserSessions !== null &&
      userSessionsUsed >= plan.maxUserSessions
    ) {
      throw new Error("Chat session limit reached");
    }

    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        userSessionsUsed: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error(`❌ incrementUserSessions error:`, error);
    throw error;
  }
}

export async function incrementAgentCount(orgId: string): Promise<void> {
  try {
    const activePlan = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
      include: { plan: true },
    });

    if (!activePlan || !activePlan.plan) return;

    const { agentsUsed, plan } = activePlan;

    // ✅ LIMIT CHECK
    if (
      plan.maxAgents !== null &&
      agentsUsed >= plan.maxAgents
    ) {
      throw new Error("Agent limit reached");
    }

    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        agentsUsed: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error(`❌ incrementAgentCount error:`, error);
    throw error;
  }
}

export async function getUsageAndLimits(orgId: string) {
  const subscription = await prisma.organizationPlan.findFirst({
    where: { orgId, isActive: true },
    include: {
      plan: true,
    },
  });

  if (!subscription?.plan) return null;

  return {
    subscription,
    plan: subscription.plan,

    usage: {
      sessionsUsed: subscription.userSessionsUsed,
      agentsUsed: subscription.agentsUsed,
    },

    limits: {
      maxUserSessions: subscription.plan.maxUserSessions,
      maxAgents: subscription.plan.maxAgents,
    },
  };
}