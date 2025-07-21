import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import axios from "axios";
import dotenv from 'dotenv';
// import { data } from "cheerio/dist/commonjs/api/attributes";
dotenv.config();

const prisma = new PrismaClient()


export const createChatSummary = async(req:Request,res:Response):Promise<any>=>{
 try {
     const { threadId } = req.params;
     
     const thread = await prisma.thread.findUnique({where:{id:threadId}})
     
     if (!thread) {
       return res.status(400).json({ message: 'Thread not found' });
     }
     const messagesResult = await prisma.message.findMany({where:{threadId:threadId,sender:"User"}})
     
     if (messagesResult.length >= 3) {
      //  api call to create the create the summary
      const data:{data:{data:chatSummary}} = await axios.post(`${process.env.NODE_AI_URL}/api/threadId/summary`,{messages:messagesResult})
      interface chatSummary{
        summary:string
        intent:string
        satisfaction_score:number
        satisfaction_reason:string
      }

      if(data.data.data){
        await prisma.chatSummary.create({data:{summary:data.data.data.summary,intent:data.data.data.intent,satisfactionReason:data.data.data.satisfaction_reason,satisfactionScore:data.data.data.satisfaction_score,threadId:threadId}})
        return res.status(200).json({message:"Summary stored sucessful",data:data.data.data})
      }else{
        return res.status(200).json({message:"Unable to store summary",})
      }
      
     } else {
       return res.status(200).json({ message: 'very few messages' });
     }
   } catch (err:any) {
     return res
       .status(500)
       .json({ message: 'Error in creating chat summary', err: err.message });
   }
}

export const getChatSummary = async(req:Request,res:Response):Promise<any>=>{
    try{
        const {threadId} = req.params
        
        const chatSummary =  await prisma.chatSummary.findMany({where:{threadId:threadId}})
        if(chatSummary){
            return res.status(200).json({messge:"Chat summery fetched sucessful",data:chatSummary})
        }else{
            return res.status(400).json({message:"chat summary not found"})
        }
    }catch(err:any){
        return res.status(500).json({message:"Error in getting the chat Summary",err:err.message})
    }
}


export const getEndChatList  =  async (req:Request,res:Response):Promise<any>=>{
  try{
    const {aiOrgId} = req.params

    const endedChatList = await prisma.thread.findMany({where:{aiOrgId:Number(aiOrgId),endedAt:{not:null}},orderBy:{createdAt:"desc"}}) 

    if(endedChatList){
      return res.status(200).json({message:"Chatlist",data:endedChatList})
    }else{
      return res.status(200).json({message:"Ended Chat list not found"})
    }

  }catch(err:any){
    return res.status(200).json({message:"Error in getting the endedChats",err:err.message})
  }
} 


export const createChatSummaryFunction=async(threadId:string)=>{
  try {
    //  const { threadId } = req.params;
     
     const thread = await prisma.thread.findUnique({where:{id:threadId}})
     
     if (!thread) {
       return 
     }
     const messagesResult = await prisma.message.findMany({where:{threadId:threadId,sender:"User"}})
     
     if (messagesResult.length >= 3) {
      //  api call to create the create the summary
      const data:{data:{data:chatSummary}} = await axios.post(`${process.env.NODE_AI_URL}/api/threadId/summary`,{messages:messagesResult})
      interface chatSummary{
        summary:string
        intent:string
        satisfaction_score:number
        satisfaction_reason:string
      }

      if(data.data.data){
        await prisma.chatSummary.create({data:{summary:data.data.data.summary,intent:data.data.data.intent,satisfactionReason:data.data.data.satisfaction_reason,satisfactionScore:data.data.data.satisfaction_score,threadId:threadId}})
        return 
      }else{
        return 
      }
      
     } else {
       return 
     }
   } catch (err:any) {
     return 
   }
}