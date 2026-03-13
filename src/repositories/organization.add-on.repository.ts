import { BillingPeriod, PrismaClient } from "@prisma/client";
import { getBillingPeriodEndDate } from "../helpers/subscription.helpers";
const prisma = new PrismaClient();

export const createOrganizationAddOn = async (orgId: string, addOnId: number, billingPeriod: BillingPeriod) => {
    return await prisma.organizationAddOn.create({
        data: {
            orgId, addOnId,
            isActive: true,
            usedThisPeriod: 0,
            limitOverride: null,
            periodStartsAt: null,
            periodEndsAt: getBillingPeriodEndDate(billingPeriod),
        },
    });
}

export const getOrganizationAddOn = async (orgId: string, addOnId: number) => {
    return await prisma.organizationAddOn.findUnique({
        where: { orgId_addOnId: { orgId, addOnId } },
    });
}