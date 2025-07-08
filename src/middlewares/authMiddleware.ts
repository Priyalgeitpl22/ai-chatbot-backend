import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const rawAuthHeader = req.headers.authorization;
  const token = rawAuthHeader?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ code: 403, message: "No token provided" });
  }

  try {

    const access_token = await prisma.access_token.findFirst({
      where: { token, active: 1 }
    });

    if (!access_token) {
      return res.status(403).json({ code: 403, message: "Invalid token or token inactive" });
    }



    const user = await prisma.user.findUnique({
      where: { id: access_token.user_id as string },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        orgId: true,
        aiOrgId: true,
        profilePicture: true,
        online: true,
        userSettings: true,
        temp_2fa_secret: true,
        two_fa_secret:true,

      }
    });

    if (!user) {
      console.log("❌ User not found for token user_id:", access_token.user_id);
      return res.status(404).json({ code: 404, message: "User not found" });
    }

    console.log("✅ User authenticated:", user.email);
    (req as any).user = user;

    next();
  } catch (error) {
    console.error("❌ Error in authMiddleware:", error);
    return res.status(403).json({ code: 403, message: "Authentication failed" });
  }
};
