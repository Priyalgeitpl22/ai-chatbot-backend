import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import multer from "multer";
import { uploadImageToS3,getPresignedUrl } from "../aws/imageUtils";
const prisma = new PrismaClient();

const upload = multer({storage:multer.memoryStorage()}).single("chatFile")

export const getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const threadId = req.params.threadId;
        const messages = await prisma.message.findMany({
            where: { threadId }, 
            orderBy: { createdAt: "asc" },
        });
        const messagesWithUrls = await Promise.all(
          messages.map(async (msg) => {
            if (msg.fileUrl) {
              return {
                ...msg,
                fileUrl: await getPresignedUrl(msg.fileUrl),
              };
            }
            return msg;
          })
        );
        res.status(200).json({ code: 200, data: messagesWithUrls, message: "success" });
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
    res.status(500).json({ code: 500, message: "Error assigning thread" })
  }
}

export const chatUploadFile  = async(req:Request,res:Response):Promise<any>=>{
  try{
    upload(req,res,async (err)=>{
      if(err){
        return res.status(400).json({code:400,message:err.message||"File not found"})
      }
      if(req.file){
        if(req.file.size>10485760){
          return res.status(400).json({code:400,message:"Too large file must less than 10 Mb"})
        }
        const fileUrl = await uploadImageToS3(req.file)

        const presignedURl = await getPresignedUrl(fileUrl)
        const response = {
          file_url:fileUrl,
          file_presigned_url:presignedURl,
          file_type:req.file.mimetype,
          file_name:req.file.originalname
        }
        return res.status(200).json({code:200,message:"file uploaded succesfully",data:response})
      }else{
    return res.status(400).json({code:400,message:"file not found"})
  } 
    })

  }catch(err:any){
    res.status(500).json({code:500,message:"Error in uploading file"})
  }
}

export const getChatPersistMessages = async (req: Request, res: Response): Promise<void> => {
  const { threadId } = req.params;
  const THREAD_EXPIRY_DAYS = parseInt(process.env.THREAD_EXPIRY_DAYS || "7", 10);
  if (isNaN(THREAD_EXPIRY_DAYS)) {
    throw new Error("THREAD_EXPIRY_DAYS is not a valid number");
  }

  if (!threadId) {
    res.status(400).json({ code: 400, message: 'Missing threadId parameter.' });
    return;
  }

  try {
    const threadWithMessages = await prisma.thread.findUnique({
      where: { id: threadId },
      select: {
        status: true,
        lastActivityAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            sender: true,
            content: true,
            createdAt: true,
            fileUrl: true,
            fileName: true,
            fileType: true,
          },
        },
      },
    });

    if (!threadWithMessages) {
      res.status(404).json({
        code: 404,
        message: 'Thread not found.',
        data: { isValid: false },
      });
      return;
    }

    const { status, lastActivityAt, messages } = threadWithMessages;

    let isValid = status === 'active';
    if (isValid && lastActivityAt) {
      const currentDate = new Date();
      const lastActivityDate = new Date(lastActivityAt);
      const diffDays = (currentDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24);
      isValid = diffDays <= THREAD_EXPIRY_DAYS;
    } else {
      isValid = false;
    }

    if (!isValid) {
      res.status(403).json({
        code: 403,
        message: 'Thread is either ended or expired.',
        data: { isValid: false },
      });
      return;
    }

    if (!messages.length) {
      res.status(200).json({
        code: 200,
        message: 'No messages found for the given threadId.',
        data: { isValid: true, messages: [] },
      });
      return;
    }

    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        const fileUrl = msg.fileUrl ? await getPresignedUrl(msg.fileUrl) : undefined;
        return {
          sender: msg.sender,
          message: msg.content,
          time: msg.createdAt.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          ...(fileUrl && { fileUrl, fileName: msg.fileName, fileType: msg.fileType }),
        };
      })
    );

    res.status(200).json({
      code: 200,
      data: { isValid: true, messages: formattedMessages, lastActivityAt },
      message: 'Messages retrieved successfully.',
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: 'Internal server error while fetching messages.',
      data: { isValid: false },
    });
  }
};

