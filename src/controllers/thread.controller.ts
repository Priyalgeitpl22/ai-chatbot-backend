import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export const getAllThreads = async (req: Request, res: Response) => {
    try {

        const user = (req as any).user;

        if (!user) {
            res.status(400).json({ code: 400, message: "Invalid user" });
        }

        const threads = await prisma.thread.findMany({
            where: {
                aiOrgId: user.aiOrgId
            },
            orderBy: {
                createdAt: "desc",
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
