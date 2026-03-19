import { Response, NextFunction } from "express";
import { getUsageAndLimits } from "../services/organization.susbcription.usage.service";
import { AuthenticatedRequest } from "../types/request.types";

export async function enforcePlanLimits(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user: any = req.user;
    const orgId = user?.orgId;

    if (!orgId) {
      res.status(400).json({
        message: "Organization ID missing",
      });
      return;
    }

    const data = await getUsageAndLimits(orgId);

    if (!data) {
      res.status(403).json({
        message: "No active subscription plan found",
      });
      return;
    }

    const { limits, usage, plan } = data;

    // ✅ AGENT LIMIT
    if (
      limits.maxAgents !== null &&
      usage.agentsUsed >= limits.maxAgents
    ) {
      res.status(402).json({
        message: `Agent limit reached (${limits.maxAgents})`,
        code: "PLAN_LIMIT_AGENTS",
      });
      return;
    }

    // ✅ CHAT LIMIT
    if (
      limits.maxUserSessions !== null &&
      usage.sessionsUsed >= limits.maxUserSessions
    ) {
      res.status(402).json({
        message: `Chat limit reached (${limits.maxUserSessions})`,
        code: "PLAN_LIMIT_CHATS",
      });
      return;
    }

    // ✅ AI CHECK
    if (!plan.hasAiChat) {
      // only block if this route needs AI (optional logic)
    }

    next();
  } catch (err) {
    console.error("[PlanLimitMiddleware]", err);

    res.status(500).json({
      message: "Failed to enforce plan limits",
    });
    return;
  }
}