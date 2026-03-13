import { PrismaClient, PlanCode } from "@prisma/client";
import { OrganizationPlanService } from "../services/organization.plan.service";

const prisma = new PrismaClient();

/**
 * Finds organizations with an active paid subscription that has expired (endsAt < now)
 * and downgrades them to the FREE plan.
 */
export async function runSubscriptionDowngradeOnExpiry(): Promise<void> {
  console.log("[SubscriptionDowngradeJob] ▶ Starting subscription downgrade job...");
  const now = new Date();

  const expiredPlans = await prisma.organizationPlan.findMany({
    where: {
      isActive: true,
      endsAt: { not: null, lte: now },
      plan: { code: { not: PlanCode.FREE } },
    },
    include: { plan: true, organization: true },
  });

  console.log(`[SubscriptionDowngradeJob] Found ${expiredPlans.length} expired subscription(s) to downgrade.`);

  let successCount = 0;
  let failureCount = 0;

  for (const orgPlan of expiredPlans) {
    const orgName = orgPlan.organization.name || orgPlan.orgId;
    const planName = orgPlan.plan.name || orgPlan.plan.code;
    try {
      const result = await OrganizationPlanService.downgradeToFreePlan(orgPlan.orgId);
      if (result.code === 200) {
        successCount++;
        console.log(
          `[SubscriptionDowngradeJob] ✅ Downgraded org ${orgPlan.orgId} (${orgName}) from ${planName} to FREE`
        );
      } else {
        failureCount++;
        console.warn(
          `[SubscriptionDowngradeJob] ⚠ Org ${orgPlan.orgId}: ${result.message}`
        );
      }
    } catch (err: any) {
      failureCount++;
      console.error(
        `[SubscriptionDowngradeJob] ❌ Failed to downgrade org ${orgPlan.orgId} (${orgName}):`,
        err?.message || err
      );
    }
  }

  console.log(
    `[SubscriptionDowngradeJob] Done. Success: ${successCount}, Failed: ${failureCount}`
  );
}
