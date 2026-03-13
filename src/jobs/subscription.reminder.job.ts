import { PrismaClient } from "@prisma/client";
import { subscriptionExpiryReminderEmail } from "../services/subscription.email.service";

const prisma = new PrismaClient();

const RENEWAL_BASE_URL = process.env.FRONTEND_URL || "https://yourapp.com";
const RENEWAL_PATH = "/settings/billing";

const REMINDER_STAGES: { days: number; field: ReminderField }[] = [
  { days: 15, field: "reminder15Sent" },
  { days: 10, field: "reminder10Sent" },
  { days: 5,  field: "reminder5Sent"  },
  { days: 1,  field: "reminder1Sent"  },
];

type ReminderField = "reminder15Sent" | "reminder10Sent" | "reminder5Sent" | "reminder1Sent";

function getDaysUntilExpiry(endsAt: Date): number {
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);

  const expiryUTC = new Date(endsAt);
  expiryUTC.setUTCHours(0, 0, 0, 0);

  const diffMs = expiryUTC.getTime() - todayUTC.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export async function runSubscriptionExpiryReminders(): Promise<void> {
  console.log("[SubscriptionReminderJob] ▶ Starting subscription expiry reminder job...");
  const startedAt = Date.now();

  const activePlans = await prisma.organizationPlan.findMany({
    where: {
      isActive: true,
      endsAt: { not: null, gt: new Date() },
    },
    include: {
      plan: true,
      organization: {
        include: {
          // Include org users with ADMIN role to get email recipients
          users: {
            where: { role: { in: ["ADMIN"] } },
          },
        },
      },
    },
  });

  console.log(`[SubscriptionReminderJob] Found ${activePlans.length} active plan(s) to evaluate.`);

  let successCount = 0;
  let failureCount = 0;

  for (const orgPlan of activePlans) {
    const daysRemaining = getDaysUntilExpiry(orgPlan.endsAt!);
    const orgName = orgPlan.organization.name || orgPlan.orgId;
    const planName = orgPlan.plan.name || orgPlan.plan.code;
    const renewalLink = `${RENEWAL_BASE_URL}${RENEWAL_PATH}`;

    // Get all admin emails for this org
    const adminEmails: string[] = orgPlan.organization.users
      .map((u: any) => u.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.warn(`[SubscriptionReminderJob] ⚠ No admin emails found for org ${orgPlan.orgId}, skipping.`);
      continue;
    }

    // Check each reminder stage
    for (const stage of REMINDER_STAGES) {
      const alreadySent = orgPlan[stage.field] as boolean;

      if (daysRemaining !== stage.days) continue; // Not the right day for this stage
      if (alreadySent) {
        console.log(
          `[SubscriptionReminderJob] ⏭ Reminder (${stage.days}d) already sent for org ${orgPlan.orgId}, skipping.`
        );
        continue;
      }

      // Send to all admins in the org
      let stageFailed = false;

      for (const email of adminEmails) {
        try {
          await subscriptionExpiryReminderEmail(
            email,
            orgName,
            planName,
            orgPlan.endsAt!,
            daysRemaining,
            renewalLink
          );

          console.log(
            `[SubscriptionReminderJob] ✅ Sent ${stage.days}-day reminder to ${email} for org ${orgPlan.orgId}`
          );

          // Log to audit table
          await prisma.subscriptionReminderLog.create({
            data: {
              orgId: orgPlan.orgId,
              orgPlanId: orgPlan.id,
              reminderStage: stage.days,
              recipientEmail: email,
              success: true,
            },
          });

          successCount++;
        } catch (err: any) {
          stageFailed = true;
          failureCount++;
          const errorMessage = err?.message || "Unknown error";

          console.error(
            `[SubscriptionReminderJob] ❌ Failed to send ${stage.days}-day reminder to ${email} for org ${orgPlan.orgId}:`,
            errorMessage
          );

          // Log failure to audit table
          await prisma.subscriptionReminderLog.create({
            data: {
              orgId: orgPlan.orgId,
              orgPlanId: orgPlan.id,
              reminderStage: stage.days,
              recipientEmail: email,
              success: false,
              errorMessage,
            },
          });
        }
      }

      if (!stageFailed) {
        try {
          await prisma.organizationPlan.update({
            where: { id: orgPlan.id },
            data: { [stage.field]: true },
          });

          console.log(
            `[SubscriptionReminderJob] 🏷 Marked reminder${stage.days}Sent=true for org ${orgPlan.orgId}`
          );
        } catch (updateErr: any) {
          console.error(
            `[SubscriptionReminderJob] ❌ Failed to mark ${stage.field} for org ${orgPlan.orgId}:`,
            updateErr?.message
          );
        }
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[SubscriptionReminderJob] ✅ Job complete in ${durationMs}ms — Successes: ${successCount}, Failures: ${failureCount}`
  );
}