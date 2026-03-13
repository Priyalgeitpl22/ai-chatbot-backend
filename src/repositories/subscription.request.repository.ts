import { PrismaClient, SubscriptionRequest } from "@prisma/client";
const prisma = new PrismaClient();

export const getAllSubscriptionRequests = async (): Promise<SubscriptionRequest[]> => {
    try {
        return await prisma.subscriptionRequest.findMany({
            include: {
                requestedBy: { select: { id: true, email: true, fullName: true } },
                addOns: { include: { addOn: { select: { id: true, name: true, code: true } } } },
                plan: { select: { id: true, name: true, code: true } }
            },
        });
    } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch subscription requests");
    }
};