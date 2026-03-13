import cron from "node-cron";

import { runSubscriptionDowngradeOnExpiry } from "./subscription.downgrade.job";
import { runSubscriptionExpiryReminders } from "./subscription.reminder.job";

const SCHEDULE = process.env.REMINDER_CRON_SCHEDULE || "0 8 * * *";
const TIMEZONE = process.env.REMINDER_CRON_TIMEZONE || "UTC";
const DOWNGRADE_SCHEDULE = process.env.DOWNGRADE_CRON_SCHEDULE || "5 0 * * *";

export function startSubscriptionReminderCron(): void {
  if (!cron.validate(SCHEDULE)) {
    console.error(
      `[SubscriptionReminderCron] ❌ Invalid cron schedule: "${SCHEDULE}". Job NOT started.`
    );
    return;
  }

  console.log(
    `[SubscriptionReminderCron] ⏰ Scheduling subscription reminder job — schedule: "${SCHEDULE}", timezone: "${TIMEZONE}"`
  );

  cron.schedule(
    SCHEDULE,
    async () => {
      console.log(`[SubscriptionReminderCron] 🕗 Triggered at ${new Date().toISOString()}`);
      try {
        await runSubscriptionExpiryReminders();
      } catch (err: any) {
        console.error(
          "[SubscriptionReminderCron] ❌ Unhandled error in reminder job:",
          err?.message || err
        );
      }
    },
    {
      timezone: TIMEZONE,
    }
  );

  console.log("[SubscriptionReminderCron] ✅ Subscription reminder cron job started.");
}

export function startSubscriptionDowngradeCron(): void {
  if (!cron.validate(DOWNGRADE_SCHEDULE)) {
    console.error(`[SubscriptionDowngradeCron] ❌ Invalid cron schedule: "${DOWNGRADE_SCHEDULE}". Job NOT started.`);
    return;
  }

  console.log(`[SubscriptionDowngradeCron] ⏰ Scheduling subscription downgrade job — schedule: "${DOWNGRADE_SCHEDULE}", timezone: "${TIMEZONE}"`);

  cron.schedule(DOWNGRADE_SCHEDULE, async () => {
      console.log(`[SubscriptionDowngradeCron] 🕗 Triggered at ${new Date().toISOString()}`);
      try {
        await runSubscriptionDowngradeOnExpiry();
      } catch (err: any) {
        console.error(`[SubscriptionDowngradeCron] ❌ Unhandled error in downgrade job: ${err?.message ?? err}`);
      }
    },
    {
      timezone: TIMEZONE,
    }
  );

  console.log("[SubscriptionDowngradeCron] ✅ Subscription downgrade cron job started.");
}