import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { threadId } from "worker_threads";

const prisma = new PrismaClient();

export const getAllThreads = async (req: Request, res: Response): Promise<any> => {
  try {

    const user = (req as any).user;

    if (!user) {
      return res.status(400).json({ code: 400, message: "Invalid user" });
    }

    const threads = await prisma.thread.findMany({
      where: {
        aiOrgId: user.aiOrgId
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    res.status(200).json({ code: 200, data: { threads: threads, TotalThreads: threads.length }, message: "success" });
  } catch (err) {
    res.status(500).json({ code: 500, message: "Error fetching threads" });
  }
};

export const searchThreads = async (req: Request, res: Response): Promise<any> => {
  try {
    const searchQuery = req.query.query as string;
    const user = (req as any).user;

    if (!user) {
      res.status(400).json({ code: 400, message: "Invalid user" });
      return;
    }
    if (!searchQuery) {
      res.status(400).json({ code: 400, message: "Missing search query" });
      return;
    }

    const threads = await prisma.thread.findMany({
      where: {
        aiOrgId: user.aiOrgId,
        messages: {
          some: {
            content: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        },
      },
      include: {
        messages: {
          where: {
            content: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        },
      },
    });

    res.status(200).json({
      code: 200,
      data: { threads, TotalThreads: threads.length },
      message: "Search completed successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ code: 500, message: "Error searching threads" });
  }
};

export const assignThread = async (req: Request, res: Response): Promise<any> => {
  try {
    const { threadId } = req.params
    const { assignedTo, assign } = req.body

    if (assign && !assignedTo) {
      return res.status(400).json({ code: 400, message: "assignedTo value is required." })
    }

    // if we want to unassign 
    if (!assign) {
      const thread = await prisma.thread.update({
        where: { id: threadId },
        data: { assignedTo: null, type: "unassigned" }
      })
      return res.status(200).json({ code: 200, thread, message: "Thread unassigned sucessful" })
    }

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: { assignedTo: assignedTo, type: "assigned" }
    })

    return res.status(200).json({ code: 200, thread, message: "Thread assigned sucessful" })

  } catch (err: any) {
    console.log(err.message)
    res.status(500).json({ code: 500, message: "Error assigning thread" })
  }
}

export const markThreadReaded = async (req: Request, res: Response): Promise<any> => {
  try {
    const { threadId } = req.params

    if (threadId) {
      const thread = await prisma.thread.findUnique({ where: { id: threadId } })
      if (thread) {
        await prisma.thread.update({ where: { id: thread.id }, data: { readed: true } })
        return res.status(200).json({ code: 200, message: "Thread readed sucessful" })
      } else {
        return res.status(400).json({ code: 400, message: "The thread not found" })
      }
    } else {
      return res.status(400).json({ code: 400, message: "Thread Id not found" })
    }
  } catch (err: any) {
    console.log(err.message)
    res.status(500).json({ code: 500, message: "Error assigning thread" })
  }
}
