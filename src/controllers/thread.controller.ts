import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export const getAllThreads = async (req: Request, res: Response): Promise<any> => {
  try {

    const user = (req as any).user;

    if (!user) {
      return res.status(400).json({ code: 400, message: "Invalid user" });
    }

    const threads = await prisma.thread.findMany({
      where: {
        aiOrgId: user.aiOrgId,
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
        },
      },
    });

    const result = threads.map((thread) => ({
      ...thread,
      latestMessage: thread.messages[0] || null,
      unseenCount: thread.messages.filter((msg) => !msg.seen).length,
    }));

    res.status(200).json({ code: 200, data: { threads: result, TotalThreads: threads.length }, message: "success" });

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
        // await prisma.message.update({where:{threadId:(threadId)},data:{sender:"true"}})
        await prisma.message.updateMany({ where: { threadId: threadId }, data: { seen: true } })
        return res.status(200).json({ code: 200, message: "Thread readed sucessful" })
      } else {
        return res.status(400).json({ code: 400, message: "The thread not found" })
      }
    } else {
      return res.status(400).json({ code: 400, message: "Thread Id not found" })
    }
  } catch (err: any) {
    res.status(500).json({ code: 500, message: "Error assigning thread" })
  }
}

export const createChatOrTicket = async (req: any, res: any) => {
  const { orgId, name, email, message } = req.body;

  try {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });

    if (!org) {
      return res.status(404).json({ code: 404, message: "Organization not found" });
    }

    if (!org.aiEnabled) {
      const onlineAgents = await prisma.user.findMany({
        where: {
          orgId,
          role: "agent", // or "admin", depending on your logic
          online: true,
        },
      });

      if (onlineAgents.length > 0) {
        return res.status(200).json({ code: 200, message: "Agent is online", connectToAgent: true });
      } else {
        // Prevent ticket creation if a thread with this email is already ended
        const endedThread = await prisma.thread.findFirst({
          where: {
            email,
            status: 'ended',
            aiOrgId: org.aiOrgId ?? 0,
          },
        });
        if (endedThread) {
          return res.status(400).json({ code: 400, message: "Chat already ended, cannot create ticket." });
        }
        // Create ticket thread
        const thread = await prisma.thread.create({
          data: {
            user: name,
            name,
            email,
            type: "ticket",
            aiOrgId: org.aiOrgId ?? 0,
            ip: req.ip,
            messages: {
              create: {
                content: message,
                sender: name,
              },
            },
          },
        });

        return res.status(200).json({
          code: 200,
          message: "No agent online, saved as ticket",
          connectToAgent: false,
          threadId: thread.id,
        });
      }
    } else {
      return res.status(200).json({ code: 200, message: "AI is enabled, handled by AI" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ code: 500, message: "Error processing chat" });
  }
};
