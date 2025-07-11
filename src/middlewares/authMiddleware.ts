import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { decrypt } from "../utils/encryption.utils";

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
        twoFactorAuth: {
          select: {
            isEnabled: true,
            isAuthenticatorAppAdded: true,
            secret: true,
            tempSecret: true,
            authenticatorAppAddedAt: true,
            enabledAt: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ code: 404, message: "User not found" });
    }

    console.log("user.twoFactorAuth",user.twoFactorAuth);
    if (user.twoFactorAuth) {
      console.log("🔐 2FA Status:", {
        isEnabled: user.twoFactorAuth.isEnabled,
        isAuthenticatorAppAdded: user.twoFactorAuth.isAuthenticatorAppAdded,
        hasSecret: !!user.twoFactorAuth.secret,
        hasTempSecret: !!user.twoFactorAuth.tempSecret,
        enabledAt: user.twoFactorAuth.enabledAt,
        authenticatorAppAddedAt: user.twoFactorAuth.authenticatorAppAddedAt
      });
    }
    
    if (user.twoFactorAuth) {
      if (user.twoFactorAuth.secret) {
        console.log("user.twoFactorAuth.secret",user.twoFactorAuth.secret);
        try {
          console
          user.twoFactorAuth.secret = decrypt(user.twoFactorAuth.secret);
        } catch (error) {
          console.log("error decrypting secret",error );
          user.twoFactorAuth.secret = null;
        }
      }

      console.log("user.twoFactorAuth.tempSecret",user.twoFactorAuth.tempSecret);
      if (user.twoFactorAuth.tempSecret) {
        try {
          console.log("decrypting tempSecret");
          user.twoFactorAuth.tempSecret = decrypt(user.twoFactorAuth.tempSecret);
        } catch (error) {
          console.log("error decrypting tempSecret",error);
          user.twoFactorAuth.tempSecret = null;
        }
      }
    }
    
    console.log("user",user);
    (req as any).user = user;
    console.log("middleware done");

    next();
  } catch (error) {
    return res.status(403).json({ code: 403, message: "Authentication failed" });
  }
};
