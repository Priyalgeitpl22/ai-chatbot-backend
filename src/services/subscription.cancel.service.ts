import {
  PrismaClient,
  CancelRequestStatus,
  SubscriptionCancelRequest,
  PlanCode,
  AddOnCode,
  BillingPeriod
} from "@prisma/client";

import { UserRoles } from "../enums";
import { getAllCancelRequests } from "../repositories/subscription.cancel.repostory";

const prisma = new PrismaClient();

export class SubscriptionCancelService {

  static async getAllCancelRequests(): Promise<SubscriptionCancelRequest[]> {
    return await getAllCancelRequests();
  }


  static async cancelSubscriptionRequest(
    user: { id: string; orgId: string; email: string; role: string },
    planCode: string,
    addOns: { name: string; code: string }[],
    billingPeriod: BillingPeriod,
    totalCost: number,
    requestee: { name: string; email: string; phone?: string; address?: string },
    reason: string,
    feedback?: string
  ) {
    let cancelRequest: any = null;

    // ✅ ROLE CHECK
    if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN) {
      return { code: 401, message: "Only admin can cancel the subscription" };
    }

    // ✅ REQUIRED FIELDS
    if (!planCode || !billingPeriod || totalCost == null) {
      return { code: 400, message: "All fields (planCode, billingPeriod, addOns, totalCost) are required" };
    }

    if (!requestee?.name || !requestee?.email || !requestee?.phone) {
      return { code: 400, message: "Name, email and phone are required" };
    }

    if (!reason) {
      return { code: 400, message: "Reason is required" };
    }

    // ✅ FETCH PLAN
    const plan = await prisma.plan.findUnique({
      where: { code: planCode as PlanCode }
    });

    if (!plan) return { code: 400, message: "Plan not found" };

    // ✅ FETCH ADDONS
    const safeAddOns = addOns ?? [];

    let addOnsData: any[] = [];

    if (safeAddOns.length > 0) {
      const addOnCodes = safeAddOns.map((a) => a.code as AddOnCode);

      addOnsData = await prisma.addOn.findMany({
        where: { code: { in: addOnCodes } }
      });

      if (addOnsData.length !== safeAddOns.length) {
        return { code: 400, message: "Invalid add-ons" };
      }
    }

    // ✅ ORG CHECK
    const organization = await prisma.organization.findUnique({
      where: { id: user.orgId }
    });

    if (!organization) {
      return { code: 400, message: "Organization not found" };
    }

    // ✅ CHECK ACTIVE PLAN
    const activePlan = await prisma.organizationPlan.findFirst({
      where: {
        orgId: user.orgId,
        isActive: true
      }
    });

    if (!activePlan) {
      return { code: 400, message: "No active subscription to cancel" };
    }

    // ✅ SEND EMAIL (you can create this similar to activation email)
    // await subscriptionCancelEmail(
    //   planCode,
    //   billingPeriod,
    //   addOns,
    //   organization.name || "",
    //   requestee,
    //   totalCost,
    //   reason
    // );

    // ✅ CHECK EXISTING REQUEST
    const existingRequest = await prisma.subscriptionCancelRequest.findFirst({
      where: {
        orgId: user.orgId,
        status: {
          in: [CancelRequestStatus.PENDING, CancelRequestStatus.APPROVED]
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (existingRequest) {

      if (existingRequest.status === CancelRequestStatus.APPROVED) {
        return {
          code: 400,
          message: "Cancel request already approved"
        };
      }

      if (existingRequest.status === CancelRequestStatus.PENDING) {
        return {
          code: 400,
          message: "Cancel request already exists and is pending"
        };
      }
    }

    // 🔁 UPDATE EXISTING
    // if (existingRequest) {

    //   cancelRequest = await prisma.subscriptionCancelRequest.update({
    //     where: { id: existingRequest.id },
    //     data: {
    //       planId: plan.id,
    //       billingPeriod,
    //       status: CancelRequestStatus.PENDING,
    //       approvedAt: null,
    //       approvedBy: null,
    //       requestedById: user.id,
    //       requesteeName: requestee.name,
    //       requesteeEmail: requestee.email,
    //       requesteePhone: requestee.phone,
    //       requesteeAddress: requestee.address,
    //       totalCost,
    //       reason,
    //       feedback,
    //     },
    //     include: {
    //       plan: true,
    //       requestedBy: true,
    //     }
    //   });

    //   return {
    //     code: 200,
    //     message: "Cancel request updated & email sent successfully",
    //     data: cancelRequest
    //   };
    // }

    // 🆕 CREATE NEW
    const result = await prisma.subscriptionCancelRequest.create({
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
        feedback
      },
      include: {
        plan: true,
        requestedBy: true,
      }
    });

    if (!result) {
      return { code: 500, message: "Failed to create cancel request", data: null };
    }

    cancelRequest = result;

    return {
      code: 200,
      message: "Cancel request created & email sent successfully",
      data: cancelRequest
    };
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

    // ✅ deactivate plan
    await prisma.organizationPlan.update({
      where: { id: activePlan.id },
      data: {
        isActive: false,
        endsAt: new Date()
      }
    });

    // ✅ update request
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