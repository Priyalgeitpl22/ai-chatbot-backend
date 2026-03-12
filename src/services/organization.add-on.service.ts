import { AddOnCode, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type AssignAddOnOptions = {
  limitOverride?: number | null;
};

/**
 * Assign an add-on to an org. Only allowed if the add-on is available for the org's current plan (PlanAddOn).
 * Syncs period (periodStartsAt, periodEndsAt) from the org's active OrganizationPlan when creating.
 */
export async function assignAddOnToOrg(
  orgId: string,
  addOnCode: string,
  options?: AssignAddOnOptions
): Promise<{ code: number; message: string; data?: any }> {
  const activePlan = await prisma.organizationPlan.findFirst({
    where: { orgId, isActive: true },
    include: { plan: true },
  });
  if (!activePlan) {
    return { code: 400, message: "No active plan assigned to this organization" };
  }

  const addOn = await prisma.addOn.findUnique({
    where: { code: addOnCode as AddOnCode },
  });
  if (!addOn) {
    return { code: 404, message: "Add-on not found" };
  }

  const planAddOn = await prisma.planAddOn.findUnique({
    where: { planId_addOnId: { planId: activePlan.planId, addOnId: addOn.id } },
  });
  if (!planAddOn) {
    return {
      code: 400,
      message: `Add-on "${addOn.name}" is not available for your current plan (${activePlan.plan.code}). Upgrade or choose a plan that includes this add-on.`,
    };
  }

  const existing = await prisma.organizationAddOn.findUnique({
    where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
    include: { addOn: true },
  });

  const periodStartsAt = activePlan.startsAt;
  const periodEndsAt = activePlan.endsAt ?? null;

  if (existing) {
    const updated = await prisma.organizationAddOn.update({
      where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
      data: {
        ...(options?.limitOverride !== undefined && { limitOverride: options.limitOverride }),
        periodStartsAt,
        periodEndsAt,
      },
      include: { addOn: true },
    });
    return { code: 200, message: "Add-on updated successfully", data: toOrgAddOnResponse(updated) };
  }

  const limitOverride = options?.limitOverride ?? null;
  const created = await prisma.organizationAddOn.create({
    data: {
      orgId,
      addOnId: addOn.id,
      limitOverride,
      usedThisPeriod: 0,
      periodStartsAt,
      periodEndsAt,
    },
    include: { addOn: true },
  });
  return { code: 201, message: "Add-on assigned successfully", data: toOrgAddOnResponse(created) };
}

/**
 * Get all add-ons assigned to an org with effective limit (limitOverride ?? addOn default).
 */
export async function getOrgAddOns(orgId: string): Promise<{ code: number; message: string; data?: any[] }> {
  const rows = await prisma.organizationAddOn.findMany({
    where: { orgId },
    include: { addOn: true },
  });
  const data = rows.map((r) => toOrgAddOnResponse(r));
  return { code: 200, message: "Add-ons fetched successfully", data };
}

/**
 * Get effective limit and usage for an add-on (e.g. for email verification).
 * Returns null if org does not have this add-on.
 */
export async function getEffectiveAddOnLimit(
  orgId: string,
  addOnCode: string
): Promise<{ limit: number; used: number; remaining: number } | null> {
  const addOn = await prisma.addOn.findUnique({ where: { code: addOnCode as AddOnCode }, select: { id: true } });
  if (!addOn) return null;
  const row = await prisma.organizationAddOn.findUnique({
    where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
    include: { addOn: true },
  });
  if (!row) return null;
  const limit = row.limitOverride ?? row.addOn.extraUserSessions ?? 0;
  const used = row.usedThisPeriod;
  const remaining = Math.max(0, limit - used);
  return { limit, used, remaining };
}

/**
 * Check if org has an add-on (by code).
 */
export async function orgHasAddOn(orgId: string, addOnCode: string): Promise<boolean> {
  const addOn = await prisma.addOn.findUnique({ where: { code: addOnCode as AddOnCode }, select: { id: true } });
  if (!addOn) return false;
  const orgAddOn = await prisma.organizationAddOn.findUnique({
    where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
  });
  return !!orgAddOn;
}

/**
 * Increment usage for an add-on (e.g. after one email verification).
 * Returns false if org doesn't have the add-on or limit would be exceeded.
 */
export async function incrementAddOnUsage(
  orgId: string,
  addOnCode: string,
  amount: number = 1
): Promise<{ ok: boolean; message?: string }> {
  const addOn = await prisma.addOn.findUnique({ where: { code: addOnCode as AddOnCode } });
  if (!addOn) return { ok: false, message: "Add-on not found" };

  const row = await prisma.organizationAddOn.findUnique({
    where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
    include: { addOn: true },
  });
  if (!row) return { ok: false, message: "Organization does not have this add-on" };

  const limit = row.limitOverride ?? row.addOn.extraUserSessions ?? 0;
  if (row.usedThisPeriod + amount > limit) {
    return { ok: false, message: "Add-on usage limit exceeded for this period" };
  }

  await prisma.organizationAddOn.update({
    where: { orgId_addOnId: { orgId, addOnId: addOn.id } },
    data: { usedThisPeriod: { increment: amount } },
  });
  return { ok: true };
}

/**
 * Get add-ons available for the org's current plan (eligible to pick).
 */
export async function getAddOnsAvailableForCurrentPlan(orgId: string): Promise<{ code: number; message: string; data?: any[] }> {
  const activePlan = await prisma.organizationPlan.findFirst({
    where: { orgId, isActive: true },
    include: { plan: { include: { addOns: { include: { addOn: true } } } } },
  });
  if (!activePlan) {
    return { code: 400, message: "No active plan assigned to this organization", data: [] };
  }
  const addOns = activePlan.plan.addOns.map((pa) => ({
    ...pa.addOn,
    alreadyAssigned: false as boolean,
  }));
  const orgAddOnIds = new Set(
    (await prisma.organizationAddOn.findMany({ where: { orgId }, select: { addOnId: true } })).map((o) => o.addOnId)
  );
  const data = addOns.map((a) => ({ ...a, alreadyAssigned: orgAddOnIds.has(a.id) }));
  return { code: 200, message: "Add-ons available for your plan", data };
}

export async function getEmailVerificationCredits(orgId: string): Promise<number> {
  const orgAddOn = await prisma.organizationAddOn.findFirst({
    where: { orgId, addOnId: 1, isActive: true },
  });

  const addOnData = await prisma.addOn.findUnique({ where: { id: 1 }, select: { extraUserSessions: true } });

  if (!addOnData) {
    throw new Error("Email verification limit not found");
  }

  if (!addOnData.extraUserSessions || Number.isNaN(addOnData.extraUserSessions)) {
    throw new Error("Email verification limit not found");
  }

  return Number(addOnData.extraUserSessions) - (orgAddOn?.usedThisPeriod ?? 0);
}

export async function deductEmailVerificationCredits(orgId: string, amount: number): Promise<boolean> {
  const orgAddOn = await prisma.organizationAddOn.findFirst({
    where: { orgId, addOnId: 1, isActive: true },
  });

  if (!orgAddOn) {
    throw new Error("Email verification add-on not found");
  }

  await prisma.organizationAddOn.update({
    where: { orgId_addOnId: { orgId, addOnId: 1 } },
    data: { usedThisPeriod: orgAddOn.usedThisPeriod + amount },
  });

  return true;
}

function toOrgAddOnResponse(row: { addOn: any; isActive: boolean; limitOverride: number | null; usedThisPeriod: number; periodStartsAt: Date | null; periodEndsAt: Date | null }) {
  const limit = row.limitOverride ?? row.addOn.emailVerificationLimit ?? null;
  return {
    addOn: row.addOn,
    isActive: row.isActive,
    limitOverride: row.limitOverride,
    effectiveLimit: limit,
    usedThisPeriod: row.usedThisPeriod,
    remainingThisPeriod: limit != null ? Math.max(0, limit - row.usedThisPeriod) : null,
    periodStartsAt: row.periodStartsAt,
    periodEndsAt: row.periodEndsAt,
  };
}
