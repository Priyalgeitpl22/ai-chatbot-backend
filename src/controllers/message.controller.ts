import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export const getMessages = async (req: Request, res: Response) => {
    try {
        const threadId = req.params.threadId;
        const messages = await prisma.message.findMany({
            where: { threadId }, 
            orderBy: { createdAt: "asc" },
        });
        res.status(200).json({ code: 200, data: messages, message: "success" });
    } catch (err) {
        res.status(500).json({ code: 500, message: "Error fetching messages" });
    }
};

