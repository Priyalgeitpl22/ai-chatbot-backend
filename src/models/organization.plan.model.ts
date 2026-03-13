import { BillingPeriod } from "@prisma/client";
import { IPlan } from "./plan.model";


export interface IOrganizationPlan {
  id: number;
  orgId: string;
  planId: number;
  billingPeriod: BillingPeriod;

  isActive: boolean;
  startsAt: Date;
  endsAt: Date | null;

  // Current period usage
  emailsSentThisPeriod: number;
  leadsAddedThisPeriod: number;

  // Stripe/Payment info
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;

  createdAt: Date;
  updatedAt: Date;

  // Relations
  organization?: IOrganizationPlan;
  plan?: IPlan;
}

// Input types for creating/updating
export interface ICreateOrganizationPlan {
  orgId: string;
  planId: number;
  billingPeriod?: BillingPeriod;
  isActive?: boolean;
  startsAt?: Date;
  endsAt?: Date | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

export interface IUpdateOrganizationPlan {
  planId?: number;
  billingPeriod?: BillingPeriod | null;
  isActive?: boolean;
  startsAt?: Date;
  endsAt?: Date | null;
  emailsSentThisPeriod?: number;
  leadsAddedThisPeriod?: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

