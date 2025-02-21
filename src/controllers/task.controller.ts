import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export const createTask = async (aiOrgId: number, threadId: string, name: string, email: string, query: string, priority: string = "low") => {
  try {
    const newTask = await prisma.task.create({
      data: {
        name,
        email,
        query,
        priority,
        status: "pending",
        aiOrgId,
        thread: { connect: { id: threadId } },
      },
    });

    console.log("Task created:", newTask);
  } catch (error) {
    console.error("Error creating task:", error);
  }
};

export const getAllTasks = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = (req as any).user; 

    if (!user) {
      return res.status(400).json({ code: 400, message: "Invalid user" });
    }

    const tasks = await prisma.task.findMany({
      where: {
        aiOrgId: Number(user.aiOrgId),
      }, orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({ code: 200, tasks, message: "success" });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ code: 500, message: "Error fetching tasks" });
  }
};
