import { PrismaClient, SubscriptionCancelRequest } from "@prisma/client";

const prisma = new PrismaClient();

export const fetchAllCancelRequest = async (): Promise<SubscriptionCancelRequest[]> => {
    try {
        return await prisma.subscriptionCancelRequest.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: {
                requestedBy: {
                    select: { id: true, email: true, fullName: true }
                },
                plan: {
                    select: { id: true, name: true, code: true }
                }
            }
        });

    } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch cancel requests");
    }
};