import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { threadId } from "worker_threads";

const prisma = new PrismaClient();

export const createAndUpdateNotification = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { threadId } = req.params;
    const { message, orgId } = req.body;

    const isNotification = await prisma.notification.findFirst({
      where: { threadId: threadId },
    });

    // if isNotification the update the notification
    if (isNotification) {
      // update notification
      const messages = [...isNotification.message, message];
      await prisma.notification.update({
        where: { id: isNotification.id },
        data: { message: messages, latestMessage: message },
      });

      return res
        .status(200)
        .json({ code: 200, message: "updated the notification sucessful" });
    } else {
      // create the notification
      const messages = [message];
      await prisma.notification.create({
        data: {
          threadId,
          latestMessage: message,
          message: messages,
          orgId: orgId,
        },
      });
      return res
        .status(200)
        .json({ code: 200, message: "created the notification sucessful" });
    }
  } catch (err) {
    res
      .status(500)
      .json({
        code: 500,
        message: "Error in creatring or updating notification",
      });
  }
};

export const getAllNotifications = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    console.log("helo");
    const { orgId } = req.params;

    const getAllNotifications = await prisma.notification.findMany({
      where: { orgId, read: false },
      include: { thread: true },
    });
    console.log(getAllNotifications, "data");
    const count = await prisma.notification.count({
      where: { orgId, read: false, notification: false },
    });
    if (getAllNotifications) {
      return res
        .status(200)
        .json({
          code: 200,
          message: "All notification sucessful",
          data: getAllNotifications,
          count: count,
        });
    } else {
      return res
        .status(200)
        .json({ code: 200, message: "No notification find" });
    }
  } catch (err) {
    res
      .status(500)
      .json({
        code: 500,
        message: "Error in getting all the notifications notification",
      });
  }
};

export const clearNotificationCount = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { threadId } = req.body;
    if (Array.isArray(threadId) && threadId.length > 0) {
      await Promise.all(
        threadId.map((id) =>
          prisma.notification.updateMany({
            where: { threadId: id },
            data: { notification: true },
          })
        )
      );
      return res.status(200).json({ code: 200, message: "sucessfull" });
    } else {
      return res.status(400).json({ code: 400, message: "threadId not found" });
    }
  } catch (err) {
    res
      .status(500)
      .json({
        code: 500,
        message:
          "Error in clearing count of all the notifications notification",
      });
  }
};

export const clearNotification = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { orgId } = req.params;

    const notificationList = await prisma.notification.findMany({
      where: { orgId, read: false },
    });

    if (notificationList.length > 0) {
      await Promise.all(
        notificationList.map((elem) =>
          prisma.notification.update({
            where: { id: elem.id },
            data: { read: true },
          })
        )
      );

      return res
        .status(200)
        .json({ code: 200, message: "Successfully cleared notifications." });
    } else {
      return res
        .status(200)
        .json({ code: 200, message: "No unread notifications to clear." });
    }
  } catch (err) {
    console.error("Error clearing notifications:", err);
    return res
      .status(500)
      .json({
        code: 500,
        message: "Internal server error while clearing notifications.",
      });
  }
};
