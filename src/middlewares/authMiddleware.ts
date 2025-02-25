import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ code: 403, message: "No token provided" });
  }

  try {
    const access_token = await prisma.access_token.findFirst({
      where: { token, active: 1 }
    });

    if (!access_token) throw new Error;

    const user = await prisma.user.findUnique({
      where: { id: access_token.user_id as string },
      select: { id: true, email: true, fullName: true, role: true, orgId: true, aiOrgId: true, profilePicture: true, online: true }
    });

    if (!user) {
      return res.status(404).json({ code: 404, message: "User not found" });
    }

    (req as any).user = user;

    next();
  } catch (error) {
    return res.status(403).json({ code: 403, message: "Invalid or expired token" });
  }
};
