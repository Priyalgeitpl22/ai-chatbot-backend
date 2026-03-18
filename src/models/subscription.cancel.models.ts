import { Organization } from "../interfaces";
import { CancelRequestStatus } from '../enums/index'
import { IOrganizationPlan } from "./organization.plan.model";
import { User } from "@prisma/client";


export interface ICreateCancelRequest {
    orgId: string;
    orgPlanId: number;
    userId: string;
    reason?: string;
    feedback?: string;
}

export interface IApproveCancelRequest {
    cancelRequestId: string;
    adminId: string;
}

export interface IRejectCancelRequest {
    cancelRequestId: string;
    adminId: string;
}

export interface SubscriptionCancelRequest {
    id: string;
    orgId: string;
    orgPlanId: number;
    requestedById: string | null;

    reason: string | null;
    feedback: string | null;

    status: CancelRequestStatus;

    approvedById: string | null;
    approvedAt: Date | null;

    cancelledAt: Date | null;

    createdAt: Date;
    updatedAt: Date;

    organization?: Organization;
    organizationPlan?: IOrganizationPlan;
    requestedBy?: User | null;
}