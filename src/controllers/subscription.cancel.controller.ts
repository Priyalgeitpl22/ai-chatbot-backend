import { UserRoles } from "../enums";
import { SubscriptionCancelService } from "../services/subscription.cancel.service";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types/request.types";

export const createCancelRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
      return;
    }

    const orgId = user.orgId;
    const userId = user.id;

    const {
      planCode,
      billingPeriod,
      addOns,
      totalCost,
      name,
      email,
      phone,
      address,
      reason,
      feedback
    } = req.body;

    if (!email || !name || !phone || !reason) {
      res.status(400).json({
        code: 400,
        message: "Email, Name, Phone and Reason are required"
      });
      return;
    }

    const response = await SubscriptionCancelService.cancelSubscriptionRequest(
      user,
      planCode,
      addOns,
      billingPeriod,
      totalCost,
      {
        name,
        email,
        phone,
        address
      },
      reason,
      feedback
    );

    res.status(201).json({
      code: 201,
      message: "Cancel request created successfully",
      // data: response
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to create cancel request" });
  }
};

export const getAllCancelRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
      return;
    }

    const cancelRequests = await SubscriptionCancelService.getAllCancelRequests();

    res.status(200).json({
      code: 200,
      message: "Cancel requests fetched successfully",
      data: cancelRequests
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to fetch cancel requests" });
  }
};


export const approveCancelRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as any;
    const user = req.user;

    if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
      return;
    }

    if (!id) {
      res.status(400).json({ code: 400, message: "Cancel request ID is required" });
      return;
    }

    const response = await SubscriptionCancelService.approveCancelRequest(user.id, id);

    res.status(response.code).json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to approve cancel request" });
  }
};