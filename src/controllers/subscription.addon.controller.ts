import { Response } from "express";
import { AuthenticatedRequest } from "../types/request.types";
import { AddOnRequestService } from "../services/subscription.addon.service";
import { UserRoles } from "../enums";


export const createAddonRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
      return;
    }

    const {
      addOns,
      billingPeriod,
      totalCost,
      name,
      email,
      phone,
      address,
      reason
    } = req.body;

    const response = await AddOnRequestService.createAddOnRequest(
      user.orgId,
      addOns,
      billingPeriod,
      {
        name,
        email,
        phone,
        address
      },
      totalCost,
      reason,
      user.id
    );

    res.status(response.code).json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 500,
      message: "Failed to create add-on request"
    });
  }
};


export const getAllAddOnRequests = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
      return;
    }

    const data = await AddOnRequestService.getAllAddOnRequests();

    res.status(200).json({
      code: 200,
      message: "Add-on requests fetched successfully",
      data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 500,
      message: "Failed to fetch add-on requests"
    });
  }
};


export const approveAddOnRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
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


export const rejectAddOnRequest = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || (user.role !== UserRoles.ADMIN && user.role !== UserRoles.SUPER_ADMIN)) {
      res.status(401).json({ code: 401, message: "Unauthorized" });
      return;
    }

    const response = await AddOnRequestService.rejectAddOnRequest(user.id, id);

    res.status(response.code).json(response);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      code: 500,
      message: "Failed to reject add-on request"
    });
  }
};