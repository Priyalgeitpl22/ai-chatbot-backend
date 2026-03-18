import { UserRoles } from "../enums";
import { Response } from "express";
import { AuthenticatedRequest } from "../types/request.types";
import { AddOnRequestService } from "../services/subscription.addon.service";


export const getAllAddOnRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = req.user as any;

        if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
            res.status(401).json({ code: 401, message: "Unauthorized" });
            return;
        }

        const addOnRequests = await AddOnRequestService.getAllAddOnRequests();

        res.status(200).json({
            code: 200,
            message: "Add-on requests fetched successfully",
            data: addOnRequests
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            code: 500,
            message: "Failed to fetch add-on requests"
        });
    }
};


export const approveAddOnRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params as any;
        const user = req.user as any;

        if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
            res.status(401).json({ code: 401, message: "Unauthorized" });
            return;
        }

        if (!id) {
            res.status(400).json({
                code: 400,
                message: "Add-on request ID is required"
            });
            return;
        }

        const response = await AddOnRequestService.approveAddOnRequest(user.id, id);

        res.status(response.code).json(response);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            code: 500,
            message: "Failed to approve add-on request"
        });
    }
};