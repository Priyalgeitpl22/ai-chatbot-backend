import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        fullName: string;
        role: string;
        orgId: string;
      };
    }
  }
}

export {};

