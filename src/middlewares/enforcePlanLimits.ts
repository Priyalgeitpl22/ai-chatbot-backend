import { Response, NextFunction } from "express";
import { getUsageAndLimits } from "../services/organization.susbcription.usage.service";
import { AuthenticatedRequest } from "../types/request.types";

export async function enforcePlanLimits(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user as { orgId?: string };
    const orgId = user?.orgId;

    // ❌ Missing orgId
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: {
          code: "ORG_ID_MISSING",
          message: "Organization ID missing",
        },
      });
      return;
    }

    // 📊 Get usage + limits
    const data = await getUsageAndLimits(orgId);

    // ❌ No plan found
    if (!data) {
      res.status(403).json({
        success: false,
        error: {
          code: "NO_ACTIVE_PLAN",
          message: "No active subscription plan found",
          upgradeRequired: true,
        },
      });
      return;
    }

    const { limits, usage, plan } = data;

    // 🧪 Debug (remove in production)
    // console.log("PLAN:", plan);
    // console.log("USAGE:", usage);
    // console.log("LIMITS:", limits);

    // 🔴 1. AI FEATURE CHECK (FIRST PRIORITY)
    if (plan?.hasAiChat !== true) {
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

    // 🔴 2. AGENT LIMIT CHECK
    if (
      limits?.maxAgents !== null &&
      limits?.maxAgents !== undefined &&
      usage?.agentsUsed >= limits.maxAgents
    ) {
      res.status(402).json({
        success: false,
        error: {
          code: "PLAN_LIMIT_AGENTS",
          message: `Agent limit reached (${limits.maxAgents})`,
          upgradeRequired: true,
        },
      });
      return;
    }

    // 🔴 3. CHAT / SESSION LIMIT CHECK
    if (
      limits?.maxUserSessions !== null &&
      limits?.maxUserSessions !== undefined &&
      usage?.sessionsUsed >= limits.maxUserSessions
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

    // ✅ All checks passed
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