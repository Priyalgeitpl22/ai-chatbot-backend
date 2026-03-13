import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { getUsageAndLimits } from "../services/organization.susbcription.usage.service";
import { AuthenticatedRequest } from "../types/request.types";


const prisma = new PrismaClient();

export async function enforcePlanLimits(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user: any = req.user;
    const orgId = user?.orgId;

    if (!orgId) {
      res.status(400).json({
        message: "Organization ID missing",
      });
      return;
    }

    const usage = await getUsageAndLimits(orgId);

    if (!usage) {
      res.status(403).json({
        message: "No active subscription plan found",
      });
      return;
    }

    const { limits, usage: usageData } = usage;

    // 🚀 Check Dynamic Data Limit
    if (
      limits.maxDynamicData !== null &&
      usageData.dynamicDataUsed >= limits.maxDynamicData
    ) {
      res.status(402).json({
        message: `Dynamic data limit reached (${limits.maxDynamicData})`,
        code: "PLAN_LIMIT_DYNAMIC_DATA",
      });
      return;
    }

    // 🚀 Check Agents Limit
    if (
      limits.maxAgents !== null &&
      usageData.agentsUsed >= limits.maxAgents
    ) {
      res.status(402).json({
        message: `Agent limit reached (${limits.maxAgents})`,
        code: "PLAN_LIMIT_AGENTS",
      });
      return;
    }

    // 🚀 Check Sessions Limit
    if (
      limits.maxUserSessions !== null &&
      usageData.sessionsUsed >= limits.maxUserSessions
    ) {
      res.status(402).json({
        message: `Session limit reached (${limits.maxUserSessions})`,
        code: "PLAN_LIMIT_SESSIONS",
      });
      return;
    }

    // attach plan info for later use
    (req as any).planLimits = limits;
    (req as any).usageData = usageData;

    next();
  } catch (err) {
    console.error("[PlanLimitMiddleware]", err);

    res.status(500).json({
      message: "Failed to enforce plan limits",
    });
  }
}