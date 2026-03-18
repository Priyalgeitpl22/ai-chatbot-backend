import {
    BillingPeriod,
    PlanCode,
    Prisma,
    PrismaClient,
    SubscriptionRequest,
    SubscriptionRequestStatus
} from "@prisma/client";

import {
    createOrganizationPlan,
    updateOrganizationPlan
} from "../repositories/orgnaization.plan.repository";

import { getBillingPeriodEndDate } from "../helpers/subscription.helpers";
import { getAllSubscriptionRequests } from "../repositories/subscription.request.repository";

const prisma = new PrismaClient();

export class SubscriptionRequestsService {

    static async getAllSubscriptionRequests(): Promise<SubscriptionRequest[]> {
        return await getAllSubscriptionRequests();
    }

    static async approveSubscriptionRequest(userId: string, subscriptionRequestId: string) {

        if (!subscriptionRequestId) {
            return { code: 400, message: "Subscription request ID is required" };
        }

        const subscriptionRequest = await prisma.subscriptionRequest.findUnique({
            where: { id: subscriptionRequestId }
        });

        if (!subscriptionRequest) {
            return { code: 400, message: "Subscription request not found" };
        }

        const activePlan = await prisma.organizationPlan.findFirst({
            where: {
                orgId: subscriptionRequest.orgId,
                isActive: true
            }
        });

        if (activePlan && activePlan.planId === subscriptionRequest.planId) {
            return { code: 400, message: "Organization already has an active plan" };
        }

        if (activePlan) {
            await updateOrganizationPlan(activePlan.id, {
                planId: subscriptionRequest.planId,
                isActive: true,
                billingPeriod: subscriptionRequest.billingPeriod,
                startsAt: new Date(),
                endsAt: getBillingPeriodEndDate(subscriptionRequest.billingPeriod),
            });
        } else {
            await createOrganizationPlan(
                subscriptionRequest.orgId,
                subscriptionRequest.planId,
                subscriptionRequest.billingPeriod
            );
        }

        await prisma.subscriptionRequest.update({
            where: { id: subscriptionRequestId },
            data: {
                status: SubscriptionRequestStatus.APPROVED,
                approvedAt: new Date(),
                approvedBy: userId,
            },
        });

        return { code: 200, message: "Plan activated successfully" };
    }

    static async createSubscriptionRequest(
        orgId: string,
        planCode: PlanCode,
        billingPeriod: BillingPeriod,
        requestee: {
            name: string;
            email: string;
            phone?: string;
            address?: string;
        },
        totalCost: number,
        requestedById?: string
    ) {

        const plan = await prisma.plan.findUnique({
            where: { code: planCode }
        });

        if (!plan) {
            return { code: 400, message: "Plan not found" };
        }

        const subscriptionRequest = await prisma.subscriptionRequest.create({
            data: {
                orgId,
                planId: plan.id,
                billingPeriod,
                requesteeName: requestee.name,
                requesteeEmail: requestee.email,
                requesteePhone: requestee.phone,
                requesteeAddress: requestee.address,
                totalCost,
                ...(requestedById && { requestedById }),
            },
            include: {
                plan: true,
                requestedBy: true,
            },
        });

        return subscriptionRequest;
    }

    static async updateSubscriptionRequest(
        subscriptionRequestId: string,
        data: any
    ): Promise<SubscriptionRequest | null> {
        try {
            const existingSubscriptionRequest =
                await prisma.subscriptionRequest.findUnique({
                    where: { id: subscriptionRequestId }
                });

            if (!existingSubscriptionRequest) return null;

            const updatedData: Prisma.SubscriptionRequestUpdateInput = {
                status: data.status ?? existingSubscriptionRequest.status,
                approvedAt: data.approvedAt ?? existingSubscriptionRequest.approvedAt,
                approvedBy: data.approvedBy ?? existingSubscriptionRequest.approvedBy,
                requesteeName: data.requesteeName ?? existingSubscriptionRequest.requesteeName,
                requesteeEmail: data.requesteeEmail ?? existingSubscriptionRequest.requesteeEmail,
                requesteePhone: data.requesteePhone ?? existingSubscriptionRequest.requesteePhone ?? null,
                totalCost: data.totalCost ?? existingSubscriptionRequest.totalCost ?? null,
                billingPeriod: data.billingPeriod ?? existingSubscriptionRequest.billingPeriod,
                ...(data.requestedById != null && {
                    requestedBy: { connect: { id: data.requestedById } }
                }),
                plan: {
                    connect: {
                        id: data.planId ?? existingSubscriptionRequest.planId,
                    },
                },
            };

            const subscriptionRequest = await prisma.subscriptionRequest.update({
                where: { id: subscriptionRequestId },
                data: updatedData,
                include: {
                    plan: true,
                    requestedBy: true,
                },
            });

            return subscriptionRequest;

        } catch (error) {
            console.error(error);
            throw new Error("Failed to update subscription request");
        }
    }
}