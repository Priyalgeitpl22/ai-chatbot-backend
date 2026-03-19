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

  priceMonthly: number | null;
  priceYearly: number | null;
  isContactSales: boolean;

  // ✅ Limits (null = unlimited)
  maxUserSessions: number | null; // chats
  maxAgents: number | null; // human agents

  // ✅ Features
  hasAiChat: boolean;
  hasCustomBranding: boolean;
  hasApiAccess: boolean;
  hasRealtimeApiData: boolean;
  hasSupportTickets: boolean;

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

  // ✅ Limits
  maxUserSessions?: number | null; // chats
  maxAgents?: number | null; // agents

  // ✅ Features
  hasAiChat?: boolean;
  hasCustomBranding?: boolean;
  hasApiAccess?: boolean;
  hasRealtimeApiData?: boolean;
  hasSupportTickets?: boolean;
}

export interface IUpdatePlan {
  code?: PlanCode;
  name?: string;
  description?: string | null;

  priceMonthly?: number | null;
  priceYearly?: number | null;
  isContactSales?: boolean;

  // ✅ Limits
  maxUserSessions?: number | null; // chats
  maxAgents?: number | null; // agents

  // ✅ Features
  hasAiChat?: boolean;
  hasCustomBranding?: boolean;
  hasApiAccess?: boolean;
  hasRealtimeApiData?: boolean;
  hasSupportTickets?: boolean;
}

