import { UserRoles } from "../enums";

import { Request, Response } from "express";
import { SubscriptionRequestsService } from "../services/subscription.request.service";
import { AuthenticatedRequest } from "../types/request.types";

export const getAllSubscriptionRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = req.user as any;
        if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
            res.status(401).json({ code: 401, message: "Unauthorized" });
            return;
        }

        const subscriptionRequests = await SubscriptionRequestsService.getAllSubscriptionRequests();
        res.status(200).json({ code: 200, message: "Subscription requests fetched successfully", data: subscriptionRequests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to fetch subscription requests" });
    }
};

export const approveSubscriptionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as any;
        const user = req.user;

        if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
            res.status(401).json({ code: 401, message: "Unauthorized" });
            return;
        }

        if (!id) {
            res.status(400).json({ code: 400, message: "Subscription request ID is required" });
            return;
        }

        const response = await SubscriptionRequestsService.approveSubscriptionRequest(user.id, id);
        res.status(response.code).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ code: 500, message: "Failed to approve subscription request" });
    }
};