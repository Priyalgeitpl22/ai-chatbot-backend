import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { deleteImageFromS3, getPresignedUrl, uploadImageToS3 } from "../aws/imageUtils";
import multer from "multer";

const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() }).single("profilePicture");

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    if (users.length > 0) {
      for (const user of users) {
        if (user.profilePicture) {
          user.profilePicture = await getPresignedUrl(user.profilePicture);
        }
      }
    }
    res.status(200).json({ code: 200, data: users, message: "success" });
  } catch (err) {
    res.status(500).json({ code: 500, message: "Error fetching users" });
  }
};

export const getAuthUser = async (req: Request, res: Response): Promise<void> => {
  const user = (req as any).user;

  if (user && user.profilePicture) {
    user.profilePicture = await getPresignedUrl(user.profilePicture);
  }

  const organizationPlan = await prisma.organizationPlan.findFirst({
    where: { orgId: user?.organization?.id, isActive: true },
    include: {
      plan: true,
    },
  });

  const organizationAddOns = await prisma.organizationAddOn.findMany({
    where: { orgId: user?.organization?.id, isActive: true },
    include: {
      addOn: true,
    },
  });

  const addOnDetails: any = organizationAddOns.map((addOn) => ({
    addOnId: addOn.addOn.id,
    code: addOn.addOn.code,
    name: addOn.addOn.name,
    isActive: addOn.isActive,
    extraUserSessions: addOn.addOn.extraUserSessions,
    usedThisPeriod: addOn.usedThisPeriod,
    periodStartsAt: addOn.periodStartsAt,
    periodEndsAt: addOn.periodEndsAt,
    priceMonthly: addOn.addOn.priceMonthly,
    priceYearly: addOn.addOn.priceYearly,
  }));

  const planDetails = {
    id: organizationPlan?.id,
    isActive: organizationPlan?.isActive,
    planId: organizationPlan?.plan.id,
    planCode: organizationPlan?.plan.code,
    planName: organizationPlan?.plan.name,
    priceMonthly: organizationPlan?.plan.priceMonthly,
    priceYearly: organizationPlan?.plan.priceYearly,
    periodStartsAt: organizationPlan?.startsAt,
    periodEndsAt: organizationPlan?.endsAt,
    maxUserSessions: organizationPlan?.plan.maxUserSessions,
    maxDynamicData: organizationPlan?.plan.maxDynamicData,
    chatHistoryLimit: organizationPlan?.plan.chatHistoryLimit,
    maxAgents: organizationPlan?.plan.maxAgents,
    userSessionsUsed: organizationPlan?.userSessionsUsed,
    dynamicDataUsed: organizationPlan?.dynamicDataUsed,
    agentsUsed: organizationPlan?.agentsUsed,
    messagesUsed: organizationPlan?.messagesUsed,
    addOns: addOnDetails,
  };
  res.status(200).json({
    user: user,
    plan :planDetails,
    message: "User details fetched successfully",
    code: 200
  });
};

export const updateUser = async (req: Request, res: Response): Promise<any> => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ code: 400, message: "Error uploading file", error: err.message });
      }

      const { id, name, email, role } = req.body;

      if (!id) {
        return res.status(400).json({ code: 400, message: "User ID is required." });
      }

      const existingUser = await prisma.user.findUnique({ where: { id } });

      if (!existingUser) {
        return res.status(404).json({ code: 404, message: "User not found" });
      }

      let profilePictureUrl: string | null = existingUser.profilePicture;
      if (req.file) {
        profilePictureUrl = await uploadImageToS3(req.file);

        if (existingUser.profilePicture)
          await deleteImageFromS3(existingUser.profilePicture);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName: name || existingUser.fullName,
          email: email || existingUser.email,
          role: role || existingUser.role,
          profilePicture: profilePictureUrl,
        },
        select: { id: true, fullName: true, email: true, role: true, profilePicture: true },
      });

      res.status(200).json({
        user: { ...updatedUser, profilePicture: updatedUser.profilePicture ? await getPresignedUrl(updatedUser.profilePicture) : null },
        message: "User details updated successfully",
        code: 200,
      });
    });

  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ code: 500, message: "Error updating user" });
  }
};

export const getUserSettings = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({ message: "Error fetching user settings" });
  }
};

export const saveUserSettings = async (req: Request, res: Response) => {
  const { userId, category, data } = req.body;

  try {
    const existing = await prisma.userSettings.findUnique({ where: { userId } });

    if (existing) {
      const updated = await prisma.userSettings.update({
        where: { userId },
        data: {
          settings: {
            ...(existing.settings as Record<string, any>),
            [category]: data,
          },
        },
      });
      res.status(200).json(updated);
    } else {
      const created = await prisma.userSettings.create({
        data: {
          userId,
          settings: {
            [category]: data,
          },
        },
      });
      res.status(201).json(created);
    }
  } catch (error) {
    console.error("Error saving user settings:", error);
    res.status(500).json({ message: "Error saving user settings" });
  }
};