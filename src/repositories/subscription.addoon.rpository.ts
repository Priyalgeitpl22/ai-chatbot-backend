import { PrismaClient, AddOnRequest } from "@prisma/client";
const prisma = new PrismaClient();

export const getAllAddOnRequests = async (): Promise<AddOnRequest[]> => {
    try {
        return await prisma.addOnRequest.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: {
                requestedBy: {
                    select: { id: true, email: true, fullName: true }
                }
            }
        });

    } catch (error) {
        console.error(error);
        throw new Error("Failed to fetch add-on requests");
    }
};