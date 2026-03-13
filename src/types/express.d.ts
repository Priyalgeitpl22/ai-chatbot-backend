import "express";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      email: string;
      fullName: string;
      role: string;
      orgId: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};