import { PrismaClient } from "@prisma/client";
import { data } from "cheerio/dist/commonjs/api/attributes";
<<<<<<< Updated upstream
import { data } from "cheerio/dist/commonjs/api/attributes";
=======
>>>>>>> Stashed changes
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
            aiOrgId: user.aiOrgId,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
<<<<<<< Updated upstream
          where: {
            aiOrgId: user.aiOrgId,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            _count: {
              select: { messages: true }, // total messages count // total messages count
=======
            _count: {
              select: { messages: true }, // total messages count
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

const result = threads.map((thread) => ({
  ...thread,
  latestMessage: thread.messages[0] || null,
  unseenCount: thread.messages.filter((msg) => !msg.seen).length,
}));


        
        
        res.status(200).json({ code: 200, data: { threads: result, TotalThreads: threads.length }, message: "success" });
=======
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  } catch (err: any) {
=======
export const markThreadReaded = async(req:Request,res:Response):Promise<any>=>{
  try{
    const {threadId} = req.params

    if(threadId){
      const thread = await prisma.thread.findUnique({where:{id:threadId}})
      if(thread){
        await prisma.thread.update({where:{id:thread.id},data:{readed:true}})
        // await prisma.message.update({where:{threadId:(threadId)},data:{sender:"true"}})
        await prisma.message.updateMany({where:{threadId:threadId},data:{seen:true}})
        return res.status(200).json({code:200,message:"Thread readed sucessful"})
      }else{
        return res.status(400).json({code:400,message:"The thread not found"})
      }
    }else{
      return res.status(400).json({code:400,message:"Thread Id not found"})
    }
  }catch(err:any){
>>>>>>> Stashed changes
    console.log(err.message)
    res.status(500).json({ code: 500, message: "Error assigning thread" })
  }
}

<<<<<<< Updated upstream
export const markThreadReaded = async (req: Request, res: Response): Promise<any> => {
  try {
    const { threadId } = req.params

    if (threadId) {
      const thread = await prisma.thread.findUnique({ where: { id: threadId } })
      if (thread) {
        await prisma.thread.update({ where: { id: thread.id }, data: { readed: true } })
        // await prisma.message.update({where:{threadId:(threadId)},data:{sender:"true"}})
        await prisma.message.updateMany({where:{threadId:threadId},data:{seen:true}})
        // await prisma.message.update({where:{threadId:(threadId)},data:{sender:"true"}})
        await prisma.message.updateMany({where:{threadId:threadId},data:{seen:true}})
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



=======
>>>>>>> Stashed changes

