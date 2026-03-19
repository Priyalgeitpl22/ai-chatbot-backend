import {
    PrismaClient,
    AddOnCode,
    BillingPeriod,
    AddOnRequestStatus
} from "@prisma/client";

import { getBillingPeriodEndDate } from "../helpers/subscription.helpers";

const prisma = new PrismaClient();

export class AddOnRequestService {


    static async getAllAddOnRequests() {
        return prisma.addOnRequest.findMany({
            include: {
                addOn: true,
                requestedBy: true,
                organization: true
            },
            orderBy: { createdAt: "desc" }
        });
    }


    // ✅ CREATE
    static async createAddOnRequest(
        orgId: string,
        addOns: { code: AddOnCode; limitOverride?: number }[],
        billingPeriod: BillingPeriod,
        requestee: {
            name: string;
            email: string;
            phone?: string;
            address?: string;
        },
        totalCost: number,
        reason?: string,
        requestedById?: string
    ) {
        try {
            if (!addOns?.length) {
                return { code: 400, message: "Add-ons are required" };
            }

            if (!requestee?.name || !requestee?.email) {
                return { code: 400, message: "Requestee name and email are required" };
            }

            const addOnCodes = addOns.map(a => a.code);

            const addOnRecords = await prisma.addOn.findMany({
                where: { code: { in: addOnCodes } }
            });

            if (addOnRecords.length !== addOnCodes.length) {
                return { code: 400, message: "Invalid add-ons provided" };
            }

            for (const addOn of addOnRecords) {
                const existing = await prisma.addOnRequest.findFirst({
                    where: {
                        orgId,
                        addOnId: addOn.id,
                        status: "PENDING"
                    }
                });

                if (existing) {
                    return {
                        code: 400,
                        message: `Add-on request already pending for ${addOn.code}`
                    };
                }
            }
            const createdRequests = await Promise.all(
                addOnRecords.map((addOn) => {
                    const input = addOns.find(a => a.code === addOn.code);

                    return prisma.addOnRequest.create({
                        data: {
                            orgId,
                            addOnId: addOn.id,
                            billingPeriod,
                            requesteeName: requestee.name,
                            requesteeEmail: requestee.email,
                            requesteePhone: requestee.phone,
                            requesteeAddress: requestee.address,
                            totalCost,
                            reason,
                            limitOverride: input?.limitOverride,
                            ...(requestedById && { requestedById })
                        },
                        include: {
                            addOn: true,
                            requestedBy: true
                        }
                    });
                })
            );

            return {
                code: 200,
                message: "Add-on request(s) created successfully",
                data: createdRequests
            };

        } catch (error) {
            console.error(error);
            return { code: 500, message: "Failed to create add-on request" };
        }
    }

    static async approveAddOnRequest(userId: string, requestId: string) {
        try {
            const request = await prisma.addOnRequest.findUnique({
                where: { id: requestId }
            });

            if (!request) {
                return { code: 400, message: "Add-on request not found" };
            }

            if (request.status !== AddOnRequestStatus.PENDING) {
                return { code: 400, message: "Request already processed" };
            }

            await prisma.organizationAddOn.upsert({
                where: {
                    orgId_addOnId: {
                        orgId: request.orgId,
                        addOnId: request.addOnId
                    }
                },
                update: {
                    isActive: true,
                    periodStartsAt: new Date(),
                    periodEndsAt: getBillingPeriodEndDate(request.billingPeriod),
                    limitOverride: request.limitOverride ?? undefined
                },
                create: {
                    orgId: request.orgId,
                    addOnId: request.addOnId,
                    isActive: true,
                    periodStartsAt: new Date(),
                    periodEndsAt: getBillingPeriodEndDate(request.billingPeriod),
                    limitOverride: request.limitOverride
                }
            });

            await prisma.addOnRequest.update({
                where: { id: requestId },
                data: {
                    status: AddOnRequestStatus.APPROVED,
                    approvedAt: new Date(),
                    approvedBy: userId
                }
            });

            return {
                code: 200,
                message: "Add-on activated successfully"
            };

        } catch (error) {
            console.error(error);
            return { code: 500, message: "Failed to approve add-on request" };
        }
    }



    static async rejectAddOnRequest(userId: string, requestId: string) {
        try {
            const request = await prisma.addOnRequest.findUnique({
                where: { id: requestId }
            });

            if (!request) {
                return { code: 400, message: "Add-on request not found" };
            }

            if (request.status !== AddOnRequestStatus.PENDING) {
                return { code: 400, message: "Request already processed" };
            }

            await prisma.addOnRequest.update({
                where: { id: requestId },
                data: {
                    status: AddOnRequestStatus.REJECTED,
                    approvedAt: new Date(),
                    approvedBy: userId
                }
            });

            return {
                code: 200,
                message: "Add-on request rejected successfully"
            };

        } catch (error) {
            console.error(error);
            return { code: 500, message: "Failed to reject add-on request" };
        }
    }
}