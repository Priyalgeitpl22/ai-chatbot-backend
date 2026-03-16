import { CancelRequestStatus } from "@prisma/client";
import { ICreateCancelRequest, IApproveCancelRequest, IRejectCancelRequest } from "../models/subscription.cancel.models";
import { SubscriptionCancelRepository } from "../repositories/subscription.cancel.repostory";


export class SubscriptionCancelService {

    private repo = new SubscriptionCancelRepository();

    async createCancelRequest(data: ICreateCancelRequest) {

        const plan = await this.repo.findActivePlan(data.orgPlanId, data.orgId);


        if (!plan) {
            throw new Error("Active subscription not found");
        }

        const existing = await this.repo.findPendingCancelRequest(data.orgPlanId);

        if (existing) {
            throw new Error("Cancel request already pending");
        }

        const cancelRequest = await this.repo.createCancelRequest(data);

        return {
            message: "Cancel request created successfully",
            data: cancelRequest
        };
    }

    async approveCancelRequest(data: IApproveCancelRequest) {

        const cancelRequest = await this.repo.findCancelRequest(data.cancelRequestId);

        if (!cancelRequest) {
            throw new Error("Cancel request not found");
        }

        if (cancelRequest.status !== CancelRequestStatus.PENDING) {
            throw new Error("Request already processed");
        }

        await this.repo.approveCancelRequest(
            data.cancelRequestId,
            cancelRequest.orgPlanId,
            data.adminId
        );

        return {
            message: "Subscription cancelled successfully"
        };
    }

    async rejectCancelRequest(data: IRejectCancelRequest) {

        const cancelRequest = await this.repo.findCancelRequest(data.cancelRequestId);

        if (!cancelRequest) {
            throw new Error("Cancel request not found");
        }

        if (cancelRequest.status !== CancelRequestStatus.PENDING) {
            throw new Error("Request already processed");
        }

        await this.repo.rejectCancelRequest(data.cancelRequestId, data.adminId);

        return {
            message: "Cancel request rejected"
        };
    }

    async getCancelRequests() {
        const requests = await this.repo.getCancelRequests();

        return {
            message: "Cancel requests fetched successfully",
            data: requests
        };
    }
}