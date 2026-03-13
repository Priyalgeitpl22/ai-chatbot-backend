import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    orgId: string;
  };

  planLimits?: any;
  usageData?: any;
}