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

    const orgId =
      user?.orgId ||
      (req.query.orgId as string) ||
      (req.body?.orgId as string);


    // ❌ Missing orgId
    if (!orgId) {
      res.status(400).json({
        success: false,
        error: {
          code: "ORG_ID_MISSING",
          message: "Organization ID is required",
        },
      });
      return;
    }

    // =========================================================
    // 📊 Fetch ACTIVE PLAN + USAGE
    // =========================================================
    const data = await getUsageAndLimits(orgId);

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
    
    console.log("📏 LIMITS:", limits);

    // =========================================================
    // 🔴 GLOBAL AGENT LIMIT CHECK (NO ROUTE CHECK)
    // =========================================================
    if (
      limits?.maxAgents != null &&
      usage?.agentsUsed >= limits.maxAgents
    ) {
      console.log("❌ Agent limit exceeded");

      res.status(402).json({
        success: false,
        error: {
          code: "PLAN_LIMIT_AGENTS",
          message: `You have reached your agent limit (${limits.maxAgents}). Upgrade your plan.`,
          upgradeRequired: true,
        },
      });
      return;
    }

    // =========================================================
    // ✅ SUCCESS
    // =========================================================
    console.log("✅ Agent check passed");
    console.log("========== [AgentLimitMiddleware END] ==========\n");

    next();
  } catch (err) {
    console.error("🔥 Middleware Error:", err);

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong while validating agent limits.",
      },
    });
    return;
  }
}