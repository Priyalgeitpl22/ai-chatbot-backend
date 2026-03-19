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
      res.status(429).json({
        success: false,
        error: {
          code: "PLAN_LIMIT_CHATS",
          message: `You have reached your chat/session limit (${limits.maxUserSessions}).`,
          upgradeRequired: true,
        },
      });
      return;
    }

    // 🔴 AI feature not allowed
    if (!plan.hasAiChat) {
      res.status(403).json({
        success: false,
        error: {
          code: "PLAN_NO_AI_ACCESS",
          message: "AI Chat feature is not available in your current plan.",
          upgradeRequired: true,
        },
      });
      return;
    }

    // ✅ All good
    next();
  } catch (err) {
    console.error("[PlanLimitMiddleware]", err);

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong while validating plan limits.",
      },
    });
  }
}