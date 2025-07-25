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
  try {
    const threadId = req.params.threadId;

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    const formattedMessages = await Promise.all(
      messages.map(async (msg) => {
        const fileUrl = msg.fileUrl ? await getPresignedUrl(msg.fileUrl) : undefined;

        return {
          sender: msg.sender,
          message: msg.content,
          time: new Date(msg.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          ...(fileUrl && { fileUrl }),
        };
      })
    );

    res.status(200).json({
      code: 200,
      data: formattedMessages,
      message: "success",
    });
  } catch (err) {
    res.status(500).json({
      code: 500,
      message: "Error fetching messages",
    });
  }
};

