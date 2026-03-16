import { PrismaClient } from "@prisma/client";
import { CancelRequestStatus } from "../enums";
import { ICreateCancelRequest } from "../models/subscription.cancel.models";

const prisma = new PrismaClient();

export class SubscriptionCancelRepository {

  async findActivePlan(orgPlanId: number, orgId: string) {

    return prisma.organizationPlan.findFirst({
      where: {
        id: orgPlanId,
        orgId,
        isActive: true
      }
    });
  }

  async findPendingCancelRequest(orgPlanId: number) {
    return prisma.subscriptionCancelRequest.findFirst({
      where: {
        orgPlanId,
        status: CancelRequestStatus.PENDING
      }
    });
  }

  async createCancelRequest(data: ICreateCancelRequest) {

    return prisma.subscriptionCancelRequest.create({
      data: {
        orgId: data.orgId,
        orgPlanId: data.orgPlanId,
        requestedById: data.userId,
        reason: data.reason,
        feedback: data.feedback,
        status: CancelRequestStatus.PENDING
      }
    });
  }

  async findCancelRequest(id: string) {
    return prisma.subscriptionCancelRequest.findUnique({
      where: { id }
    });
  }

  async approveCancelRequest(cancelRequestId: string, orgPlanId: number, adminId: string) {
    return prisma.$transaction([
      prisma.subscriptionCancelRequest.update({
        where: { id: cancelRequestId },
        data: {
          status: CancelRequestStatus.APPROVED,
          approvedById: adminId,
          approvedAt: new Date(),
          cancelledAt: new Date()
        }
      }),
      prisma.organizationPlan.update({
        where: { id: orgPlanId },
        data: {
          isActive: false,
          endsAt: new Date()
        }
      })
    ]);
  }

  async rejectCancelRequest(cancelRequestId: string, adminId: string) {
    return prisma.subscriptionCancelRequest.update({
      where: { id: cancelRequestId },
      data: {
        status: CancelRequestStatus.REJECTED,
        approvedById: adminId,
        approvedAt: new Date()
      }
    });
  }

  async getCancelRequests() {
    return prisma.subscriptionCancelRequest.findMany({
      include: {
        organization: true,
        organizationPlan: true,
        requestedBy: true
      },
      orderBy: { createdAt: "desc" }
    });
  }
}