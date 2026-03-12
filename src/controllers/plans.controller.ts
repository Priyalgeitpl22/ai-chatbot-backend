import { Request, Response } from "express";
import { PlanService } from "../services/plan.service";

export const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await PlanService.getAll();
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to fetch plans" });
  }
};

export const getPlanByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params as any;
    const response = await PlanService.getByCode(code);
    res.status(response.code).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Failed to fetch plan" });
  }
};
