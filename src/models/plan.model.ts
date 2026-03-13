// ============================================================================
// Plan Model (Subscription plans)
// ============================================================================

import { PlanCode } from "../enums";
import { IOrganizationPlan } from "./organization.plan.model";



export interface IPlan {
  id: number;
  code: PlanCode;
  name: string;
  description: string | null;
  priceMonthly: number | null; // Decimal stored as number
  priceYearly: number | null; // Decimal stored as number
  isContactSales: boolean;

  // Limits (null = unlimited)
  maxUsers: number | null;
  maxSenderAccounts: number | null;
  maxLeadsPerMonth: number | null;
  maxEmailsPerMonth: number | null;
  maxCampaigns: number | null;

  // Features
  hasEmailVerification: boolean;
  hasEmailWarmup: boolean;
  hasUnifiedInbox: boolean;
  hasApiAccess: boolean;
  hasCustomDomain: boolean;
  hasAdvancedAnalytics: boolean;
  hasPrioritySupport: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  subscriptions?: IOrganizationPlan[];
}

// Input types for creating/updating
export interface ICreatePlan {
  code: PlanCode;
  name: string;
  description?: string | null;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  isContactSales?: boolean;
  maxUsers?: number | null;
  maxSenderAccounts?: number | null;
  maxLeadsPerMonth?: number | null;
  maxEmailsPerMonth?: number | null;
  maxCampaigns?: number | null;
  hasEmailVerification?: boolean;
  hasEmailWarmup?: boolean;
  hasUnifiedInbox?: boolean;
  hasApiAccess?: boolean;
  hasCustomDomain?: boolean;
  hasAdvancedAnalytics?: boolean;
  hasPrioritySupport?: boolean;
}

export interface IUpdatePlan {
  code?: PlanCode;
  name?: string;
  description?: string | null;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  isContactSales?: boolean;
  maxUsers?: number | null;
  maxSenderAccounts?: number | null;
  maxLeadsPerMonth?: number | null;
  maxEmailsPerMonth?: number | null;
  maxCampaigns?: number | null;
  hasEmailVerification?: boolean;
  hasEmailWarmup?: boolean;
  hasUnifiedInbox?: boolean;
  hasApiAccess?: boolean;
  hasCustomDomain?: boolean;
  hasAdvancedAnalytics?: boolean;
  hasPrioritySupport?: boolean;
}

