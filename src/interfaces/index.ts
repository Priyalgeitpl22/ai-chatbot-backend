import { AddOnCode, BillingPeriod, PlanCode, SubscriptionRequestStatus } from "@prisma/client";

export interface AIResponse {
  connect_agent: any;
  message?: string,
  status: number,
  question?: string,
  answer?: string
  task_creation?: boolean
}

export interface Organization {
  id?: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: number | null;
  domain?: string;
  industry?: string;
}

export interface CurrentPlanData {
  basePlan: {
    id: number;
    code: PlanCode;
    name: string;

    // Plan limits
    maxUserSessions: number | null;
    maxDynamicData: number | null;
    chatHistoryLimit: number | null;
    maxAgents: number | null;

    // Usage
    sessionsUsedThisPeriod: number;
    dynamicDataUsedThisPeriod: number;
    agentsCount: number;

    startsAt: Date;
    endsAt: Date | null;
  };

  addOns: {
    id: number;
    code: AddOnCode;
    name: string;

    // Addon benefit
    extraUserSessions: number | null;

    // Usage
    usedThisPeriod: number;

    periodStartsAt: Date | null;
    periodEndsAt: Date | null;
  }[];

  subscriptionRequest: {
    id: string;
    orgId: string;
    planCode: PlanCode;
    planId: number;
    billingPeriod: BillingPeriod;
    requestedById: string | null;
    totalCost: number;
    status: SubscriptionRequestStatus;
    approvedAt: Date | null;
    approvedBy: string | null;
    name: string;
  } | null;
  requestedAddOns: {
    id: number;
    addOnId: number;
    subscriptionRequestId: string;
  }[] | null;

}