import { BillingPeriod } from "@prisma/client";

export const getBillingPeriodEndDate = (billingPeriod: BillingPeriod) => {
    if (billingPeriod === BillingPeriod.MONTHLY) {
        return new Date(new Date().setMonth(new Date().getMonth() + 1));
    } else if (billingPeriod === BillingPeriod.YEARLY) {
        return new Date(new Date().setFullYear(new Date().getFullYear() + 1));
    }
    return null;
};  