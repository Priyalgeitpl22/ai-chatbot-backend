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

export const markMessageReaded = async(req:Request,res:Response):Promise<any>=>{
  try{
    const {threadId} = req.params

    if(threadId){
        await prisma.message.updateMany({where:{threadId:threadId},data:{seen:true}})
        return res.status(200).json({code:200,message:"message seen sucessful"})
    }else{
    return res.status(400).json({ code: 400, message: "thredId not found" })
    }
  }catch(err:any){
    console.log(err.message)
    res.status(500).json({ code: 500, message: "Error assigning thread" })
  }
}

