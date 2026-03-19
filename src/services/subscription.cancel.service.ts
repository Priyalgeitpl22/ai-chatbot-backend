import {
  PrismaClient,
  CancelRequestStatus,
  SubscriptionCancelRequest,
  PlanCode,
  BillingPeriod
} from "@prisma/client";

import { UserRoles } from "../enums";
import { fetchAllCancelRequest } from "../repositories/subscription.cancel.repostory";


const prisma = new PrismaClient();

export class SubscriptionCancelService {

  static async getAllCancelRequests(): Promise<SubscriptionCancelRequest[]> {
    return await fetchAllCancelRequest();
  }


  static async cancelSubscriptionRequest(
    user: { id: string; orgId: string; email: string; role: string },
    planCode: string,
    billingPeriod: BillingPeriod,
    totalCost: number,
    requestee: { name: string; email: string; phone?: string; address?: string },
    reason: string,
    feedback?: string
  ) {
    try {

      if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN) {
        return { code: 401, message: "Only admin can cancel the subscription" };
      }

      if (!planCode || !billingPeriod || totalCost == null) {
        return { code: 400, message: "All fields (planCode, billingPeriod, totalCost) are required" };
      }

      if (!requestee?.name || !requestee?.email || !requestee?.phone) {
        return { code: 400, message: "Name, email and phone are required" };
      }

      if (!reason) {
        return { code: 400, message: "Reason is required" };
      }


      if (!Object.values(PlanCode).includes(planCode as PlanCode)) {
        return {
          code: 400,
          message: "Invalid plan code"
        };
      }


      const plan = await prisma.plan.findUnique({
        where: { code: planCode as PlanCode }
      });

      if (!plan) {
        return { code: 400, message: "Plan not found" };
      }

      const organization = await prisma.organization.findUnique({
        where: { id: user.orgId }
      });

      if (!organization) {
        return { code: 400, message: "Organization not found" };
      }

      const activePlan = await prisma.organizationPlan.findFirst({
        where: {
          orgId: user.orgId,
          isActive: true
        }
      });
      console.log(activePlan, "activePlan")

      if (!activePlan) {
        return { code: 400, message: "No active subscription to cancel" };
      }

      if (activePlan.planId !== plan.id) {
        return {
          code: 400,
          message: "You can only cancel the currently active plan"
        };
      }


      const existingRequest = await prisma.subscriptionCancelRequest.findFirst({
        where: {
          orgId: user.orgId,
          planId: plan.id,
          status: CancelRequestStatus.PENDING
        }
      });

      if (existingRequest) {
        return {
          code: 400,
          message: "Cancel request already exists for this plan"
        };
      }

      const cancelRequest = await prisma.subscriptionCancelRequest.create({
        data: {
          orgId: user.orgId,
          planId: plan.id,
          billingPeriod,
          requestedById: user.id,
          requesteeName: requestee.name,
          requesteeEmail: requestee.email,
          requesteePhone: requestee.phone,
          requesteeAddress: requestee.address,
          totalCost,
          reason,
          feedback,
          status: CancelRequestStatus.PENDING
        },
        include: {
          plan: true,
          requestedBy: true
        }
      });

      return {
        code: 200,
        message: "Cancel request created successfully",
        data: cancelRequest
      };

    } catch (error) {
      console.error("Cancel Subscription Error:", error);
      return {
        code: 500,
        message: "Internal server error"
      };
    }
  }

  static async approveCancelRequest(userId: string, cancelRequestId: string) {

    if (!cancelRequestId) {
      return { code: 400, message: "Cancel request ID is required" };
    }

    const cancelRequest = await prisma.subscriptionCancelRequest.findUnique({
      where: { id: cancelRequestId }
    });

    if (!cancelRequest) {
      return { code: 400, message: "Cancel request not found" };
    }

    if (cancelRequest.status !== CancelRequestStatus.PENDING) {
      return { code: 400, message: "Request already processed" };
    }

    const activePlan = await prisma.organizationPlan.findFirst({
      where: {
        orgId: cancelRequest.orgId,
        isActive: true
      }
    });

    if (!activePlan) {
      return { code: 400, message: "No active plan found" };
    }

    await prisma.organizationPlan.deleteMany({
      where: {
        orgId: activePlan.orgId,
        isActive: false
      }
    });


    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        isActive: false,
        endsAt: new Date()
      }
    });


    await prisma.subscriptionCancelRequest.update({
      where: { id: cancelRequestId },
      data: {
        status: CancelRequestStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: userId,
        cancelledAt: new Date()
      }
    });

    return { code: 200, message: "Subscription cancelled successfully" };
  }
}