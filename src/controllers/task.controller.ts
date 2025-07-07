import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

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


export const assignTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { assignedTo, assign } = req.body;
    console.log(id, assign)
    if (assign && !assignedTo) {
      return res.status(400).json({ code: 400, message: "assignedTo value is required." });
    }

    // un assigning the task
    if (!assign) {
      const task = await prisma.task.update({
        where: { id: id },
        data: { assignedTo: null }
      });
      return res.status(200).json({ code: 200, task, message: "Task unassigned successfully" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { assignedTo },
    });
    console.log(task)
    return res.status(200).json({ code: 200, task, message: "Task assigned successfully" });
  } catch (err) {
    console.error("Error assigning task:", err);
    res.status(500).json({ code: 500, message: "Error assigning task" });
  }
};

export const getUnreadTicketCount = async (req: Request, res: Response): Promise<any> => {
  try {
    const { orgId } = req.query;
    const count = await prisma.task.count({
      where: {
        orgId: orgId as string,
        assignedTo: null,
      },
    });
    res.status(200).json({ code: 200, count });
  } catch (err) {
    console.error("Error fetching unread ticket count:", err);
    res.status(500).json({ code: 500, message: "Error fetching unread ticket count" });
  }
};

export const markTaskAsResolved = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: "resolved" },
    });
    res.status(200).json({ code: 200, task: updatedTask, message: "Task marked as resolved" });
  } catch (err) {
    console.error("Error marking task as resolved:", err);
    res.status(500).json({ code: 500, message: "Error marking task as resolved" });
  }
};