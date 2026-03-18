import {
    PrismaClient,
    AddOnRequest,
    AddOnCode,
    BillingPeriod,
    AddOnRequestStatus
} from "@prisma/client";

import { UserRoles } from "../enums";
import { getAllAddOnRequests } from "../repositories/subscription.addoon.rpository";

const prisma = new PrismaClient();

export class AddOnRequestService {

    // ✅ GET ALL
    static async getAllAddOnRequests(): Promise<AddOnRequest[]> {
        return await getAllAddOnRequests();
    }

    // ✅ CREATE ADD-ON REQUEST
    static async createAddOnRequest(
        user: { id: string; orgId: string; role: string },
        addOns: { code: string }[],
        billingPeriod: BillingPeriod,
        totalCost: number,
        reason: string,
        requestee: {
            name: string;
            email: string;
            phone?: string;
            address?: string;
        }
    ) {

        // 🔐 ROLE CHECK
        if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN) {
            return { code: 401, message: "Only admin can request add-ons" };
        }

        // ✅ VALIDATION
        if (!addOns?.length || !billingPeriod || totalCost == null) {
            return { code: 400, message: "Add-ons, billingPeriod and totalCost are required" };
        }

        if (!requestee?.name || !requestee?.email) {
            return { code: 400, message: "Requestee name and email are required" };
        }

        // ✅ FETCH ADDONS
        const addOnCodes = addOns.map(a => a.code as AddOnCode);

        const addOnData = await prisma.addOn.findMany({
            where: { code: { in: addOnCodes } }
        });

        if (addOnData.length !== addOnCodes.length) {
            return { code: 400, message: "Invalid add-ons" };
        }

        // ✅ CHECK ACTIVE PLAN
        const activePlan = await prisma.organizationPlan.findFirst({
            where: {
                orgId: user.orgId,
                isActive: true
            }
        });

        if (!activePlan) {
            return { code: 400, message: "No active subscription found" };
        }

        // ✅ CREATE REQUESTS (1 per add-on)
        const requests = await Promise.all(
            addOnData.map(addOn =>
                prisma.addOnRequest.create({
                    data: {
                        orgId: user.orgId,
                        addOnId: addOn.id,
                        requestedById: user.id,
                        billingPeriod,
                        totalCost,
                        reason,

                        // ✅ REQUIRED FIELDS
                        requesteeName: requestee.name,
                        requesteeEmail: requestee.email,
                        requesteePhone: requestee.phone,
                        requesteeAddress: requestee.address
                    },
                    include: {
                        addOn: true,
                        requestedBy: true
                    }
                })
            )
        );

        return {
            code: 200,
            message: "Add-on requests created successfully",
            data: requests
        };
    }


    // ✅ APPROVE ADD-ON REQUEST
    static async approveAddOnRequest(userId: string, requestId: string) {

        if (!requestId) {
            return { code: 400, message: "Add-on request ID is required" };
        }

        const request = await prisma.addOnRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) {
            return { code: 400, message: "Add-on request not found" };
        }

        if (request.status !== AddOnRequestStatus.PENDING) {
            return { code: 400, message: "Request already processed" };
        }

        // ✅ UPSERT ORG ADD-ON
        await prisma.organizationAddOn.upsert({
            where: {
                orgId_addOnId: {
                    orgId: request.orgId,
                    addOnId: request.addOnId
                }
            },
            update: {
                isActive: true,
                periodStartsAt: new Date()
            },
            create: {
                orgId: request.orgId,
                addOnId: request.addOnId,
                isActive: true,
                periodStartsAt: new Date()
            }
        });

        // ✅ UPDATE REQUEST STATUS
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
    }


    // ❌ REJECT ADD-ON REQUEST
    static async rejectAddOnRequest(userId: string, requestId: string) {

        if (!requestId) {
            return { code: 400, message: "Add-on request ID is required" };
        }

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
    }
}