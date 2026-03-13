import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getSubscriptionRequestAddOn = async (subscriptionRequestId: string) => {
    return await prisma.subscriptionRequestAddOn.findFirst({ where: { subscriptionRequestId } });
}

export const createSubscriptionRequestAddOn = async (subscriptionRequestId: string, addOnId: number) => {
    return await prisma.subscriptionRequestAddOn.create({
        data: { subscriptionRequestId: subscriptionRequestId, addOnId: addOnId },
    });
}

export const updateSubscriptionRequestAddOn = async (subscriptionRequestId: string, addOnId: number, limitOverride: number) => {
    return await prisma.subscriptionRequestAddOn.update({
        where: { subscriptionRequestId_addOnId: { subscriptionRequestId, addOnId } },
        data: { limitOverride },
    });
}

export const deleteSubscriptionRequestAddOn = async (subscriptionRequestId: string, addOnId: number) => {
    return await prisma.subscriptionRequestAddOn.delete({
        where: { subscriptionRequestId_addOnId: { subscriptionRequestId, addOnId } },
    });
}