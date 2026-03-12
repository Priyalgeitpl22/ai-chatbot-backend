import { Request, Response, NextFunction } from 'express';
import { Plan, PlanCode, PrismaClient } from '@prisma/client';
import { PlanService } from '../services/plan.service';
const prisma = new PrismaClient();

export async function enforcePlanLimits(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req as any).user.orgId;

    const subscription = await prisma.organizationPlan.findFirst({
      where: { orgId, isActive: true },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan) {
      res.status(403).json({ message: 'No active plan assigned' });
      return;
    }

    const plan = subscription.plan;

    // if (plan.maxCampaigns !== null && plan.maxCampaigns > 0) {
    //   const liveCampaignCount = await prisma.campaign.count({
    //     where: {
    //       orgId,
    //       status: 'ACTIVE',
    //     },
    //   });

    //   if (liveCampaignCount >= plan.maxCampaigns) {
    //     res.status(402).json({
    //       message: `Plan limit reached: ${plan.maxCampaigns} active campaign(s) allowed on ${plan.name} plan.`,
    //       code: 'PLAN_LIMIT_CAMPAIGNS',
    //     });
    //     return;
    //   }
    // }

    // if (plan.maxEmailsPerMonth !== null && plan.maxEmailsPerMonth > 0) {
    //   if (subscription.emailsSentThisPeriod >= plan.maxEmailsPerMonth) {
    //     res.status(402).json({
    //       message: `Plan limit reached: ${plan.maxEmailsPerMonth} emails/month on ${plan.name} plan.`,
    //       code: 'PLAN_LIMIT_EMAILS',
    //     });
    //     return;
    //   }
    // }

    // if (plan.maxLeadsPerMonth !== null && plan.maxLeadsPerMonth > 0) {
    //   if (subscription.leadsAddedThisPeriod >= plan.maxLeadsPerMonth) {
    //     res.status(402).json({
    //       message: `Plan limit reached: ${plan.maxLeadsPerMonth} leads/month on ${plan.name} plan.`,
    //       code: 'PLAN_LIMIT_LEADS',
    //     });
    //     return;
    //   }
    // }

    // if (plan.maxSenderAccounts !== null && plan.maxSenderAccounts > 0) {
    //   const senderCount = await prisma.senderAccount.count({ where: { orgId } });
    //   if (senderCount >= plan.maxSenderAccounts) {
    //     res.status(402).json({
    //       message: `Plan limit reached: ${plan.maxSenderAccounts} sender account(s) allowed on ${plan.name} plan.`,
    //       code: 'PLAN_LIMIT_SENDER_ACCOUNTS',
    //     });
    //     return;
    //   }
    // }

    (req as any).activePlan = plan;
    (req as any).activeSubscription = subscription;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to enforce plan limits' });
  }
}

export async function checkForLeadsAddedThisPeriod(newLeadsCount: number, orgId: string) {
  try {
    const plan = await PlanService.getPlanByOrgId(orgId);

    if (!plan) {
      return { code: 402, message: 'No active plan assigned' };
    }

    switch (plan.code) {
      case PlanCode.FREE:
        // if (plan.leadsAddedThisPeriod + newLeadsCount > (plan.maxLeadsPerMonth || 0)) {
        //   return {
        //     code: 402, message: `Plan limit reached: ${plan.leadsAddedThisPeriod + newLeadsCount} leads added this period on ${plan.name} plan.`,
        //     limit: plan.maxLeadsPerMonth || 0,
        //     usage: plan.leadsAddedThisPeriod,
        //     creditsLeft: (plan.maxLeadsPerMonth || 0) - (plan.leadsAddedThisPeriod),
        //   };
        // }
        break;
      case PlanCode.STARTER:
        // if (plan.leadsAddedThisPeriod + newLeadsCount > (plan.maxLeadsPerMonth || 0)) {
        //   return {
        //     code: 402, message: `Plan limit reached: ${plan.maxLeadsPerMonth || 0} leads added this period on ${plan.name} plan.`,
        //     limit: plan.maxLeadsPerMonth || 0,
        //     usage: plan.leadsAddedThisPeriod,
        //   };
        // }
        break;
      default:
        return { code: 200, message: 'Plan limits enforced successfully' };
    }

    return { code: 200, message: 'Plan limits enforced successfully' };
  } catch (err) {
    console.error(err);
    return false;
  }
}
