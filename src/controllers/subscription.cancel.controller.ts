import { Request, Response } from "express";
import { SubscriptionCancelService } from "../services/subscription.cancel.service";

export class SubscriptionCancelController {

  private service = new SubscriptionCancelService();

  async createCancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const orgId = (req as any).user?.orgId;
      const userId = (req as any).user?.id;

      const { orgPlanId, reason, feedback } = req.body;

      const result = await this.service.createCancelRequest({
        orgId,
        orgPlanId,
        userId,
        reason,
        feedback
      });

      res.status(201).json(result);

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async approveCancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const cancelRequestId = req.params.id;

      if (!adminId) {
        res.status(401).json({
          code: 401,
          message: "Unauthorized Access"
        });
        return;
      }

      const result = await this.service.approveCancelRequest({
        cancelRequestId,
        adminId
      });

      res.status(200).json({
        code: 200,
        message: result.message
      });

    } catch (error: any) {

      if (error.message === "Cancel request not found") {
        res.status(404).json({ code: 404, message: error.message });
        return;
      }

      if (error.message === "Request already processed") {
        res.status(409).json({ code: 409, message: error.message });
        return;
      }

      res.status(500).json({
        code: 500,
        message: "Something went wrong"
      });
    }
  }

  async rejectCancelRequest(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const cancelRequestId = req.params.id;

      const result = await this.service.rejectCancelRequest({
        cancelRequestId,
        adminId
      });

      res.status(200).json(result);

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  async getCancelRequests(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getCancelRequests();
      res.status(200).json(result);

    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}