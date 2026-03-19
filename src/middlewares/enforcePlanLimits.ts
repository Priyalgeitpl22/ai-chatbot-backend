import { Response, NextFunction } from "express";
import { getUsageAndLimits } from "../services/organization.susbcription.usage.service";
import { AuthenticatedRequest } from "../types/request.types";

export async function enforcePlanLimits(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user: any = req.user;
    const orgId = user?.orgId;

    if (!orgId) {
      return res.status(400).json({
        message: "Organization ID missing",
      });
    }

    const data = await getUsageAndLimits(orgId);

    if (!data) {
      return res.status(403).json({
        message: "No active subscription plan found",
      });
    }

    const { limits, usage, plan } = data;

    // ✅ ROUTE FLAGS (very important)
    const isChatRoute = req.path.includes("thread"); 
    const isAgentRoute = req.path.includes("user");
    const isAiRoute = req.path.includes("ai");

    // 🚀 CHAT LIMIT
    if (
      isChatRoute &&
      limits.maxUserSessions !== null &&
      usage.sessionsUsed >= limits.maxUserSessions
    ) {
      return res.status(402).json({
        message: `Chat limit reached (${limits.maxUserSessions})`,
        code: "PLAN_LIMIT_CHATS",
      });
    }

    // 🚀 AGENT LIMIT
    if (
      isAgentRoute &&
      limits.maxAgents !== null &&
      usage.agentsUsed >= limits.maxAgents
    ) {
      return res.status(402).json({
        message: `Agent limit reached (${limits.maxAgents})`,
        code: "PLAN_LIMIT_AGENTS",
      });
    }

    // 🚀 AI FEATURE CHECK
    if (isAiRoute && !plan.hasAiChat) {
      return res.status(403).json({
        message: "AI feature not available in your plan",
        code: "PLAN_NO_AI",
      });
    }

    // attach for later use
    req.planLimits = limits;
    req.usageData = usage;

    next();
  } catch (err) {
    console.error("[PlanLimitMiddleware]", err);

    return res.status(500).json({
      message: "Failed to enforce plan limits",
    });
  }
}