import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { getAIResponse } from "../middlewares/botMiddleware";
import { createTask ,ReadedTask} from "../controllers/task.controller";
import { sendEmailChat } from '../utils/email.utils'
import { getPresignedUrl } from "../aws/imageUtils";
import {moveToTrash} from "../controllers/thread.controller";
import { endChatFunction } from "../controllers/chatConfig.controller";
import { threadId } from "worker_threads";


const prisma = new PrismaClient();
export const onlineAgents = new Map<string, string>(); // Map<agentId, agentName>
const socketOrgMap = new Map<string, { orgId: string; userId: string; role: string }>();

export let io: Server;

export const addOnlineAgent = (agentId: string, agentName: string) =>
  onlineAgents.set(agentId, agentName);

export const removeOnlineAgent = (agentId: string) =>
  onlineAgents.delete(agentId);

export const getOnlineAgents = () =>
  Array.from(onlineAgents.entries()).map(([id, name]) => ({ id, name }));

// Helper to emit a bot response after processing a message via AI.
const processAIResponse = async (data: any, io: Server) => {

  const online = getOnlineAgents();
  let answer: string | undefined;
  let taskCreation: any;
  let question = data.content;

  // Handle file upload with both agent and AI available
  if (data?.fileData && data?.aiEnabled) {
    answer = "Thank you for uploading your file. If you have any questions or require further assistance, would you like me to create a ticket for you?";
    await prisma.message.create({
      data: { content: answer, sender: "Bot", threadId: data.threadId },
    });
    io.emit("receiveMessage", {
      id: Date.now().toString(),
      sender: "Bot",
      status: 200,
      content: answer,
      threadId: data.threadId,
      createdAt: new Date().toISOString(),
      task_creation: false,
    });
    return;
  }

const previousMessages = await prisma.message.findMany({
  where: { threadId: data.threadId },
});
const isFirstUserMessage =
  previousMessages.filter((m:any) => m.sender === "User").length === 1;

const thread = await prisma.thread.findUnique({
  where: { id: data.threadId },
});

const agentMessageAlreadySent = previousMessages.some(
  (m:any) => m.sender === "Bot" && m.content === "An agent is available and will assist you soon. Thank you for your patience."
);
if (data.sender === 'User') {
  const prevMsgs = await prisma.message.findMany({
    where: { threadId: data.threadId },
    orderBy: { createdAt: 'desc' },
    take: 2
  });
  const lastBotMessage = prevMsgs.find((m:any) => m.sender === 'Bot');
  const isTaskPrompt = lastBotMessage && lastBotMessage.content.includes("create a ticket");
  const userReply = data.content.toLowerCase().trim();

  if(userReply.includes('create ticket')){
      io.emit("receiveMessage", {
        id: Date.now().toString(),
        sender: "Bot",
        status: 200,
        content: "",
        threadId: data.threadId,
        createdAt: new Date().toISOString(),
        task_creation: true, 
      });
      return;
  }

  if (isTaskPrompt) {
    if (userReply.includes('yes') || userReply.includes('ok') || userReply.includes('sure') || userReply.includes('yes please') || userReply.includes('create') || userReply.includes('create ticket')) {
      // User wants to create a task (show contact form)
      io.emit("receiveMessage", {
        id: Date.now().toString(),
        sender: "Bot",
        status: 200,
        content: "",
        threadId: data.threadId,
        createdAt: new Date().toISOString(),
        task_creation: true, 
      });
    } else if (userReply.includes('no') ||userReply.includes('not now') ||userReply.includes('later')) {
      // User declined
      io.emit("receiveMessage", {
        id: Date.now().toString(),
        sender: "Bot",
        status: 200,
        content: "No problem! If you need further assistance, feel free to ask.",
        threadId: data.threadId,
        createdAt: new Date().toISOString(),
        task_creation: false,
      });
      return;
    } else {
      // Unclear response, ask again
      io.emit("receiveMessage", {
        id: Date.now().toString(),
        sender: "Bot",
        status: 200,
        content: "I didn't quite catch that. Would you like me to create a ticket for your query so someone can get back to you later? Please reply with 'yes' or 'no'.",
        threadId: data.threadId,
        createdAt: new Date().toISOString(),
        task_creation: false,
      });
      return;
    }
  } else if (data.sender === 'User' && data.content.toLowerCase().includes('talk to agent')) {
    answer = "Okay, let me connect you with an agent. Thank you for your patience.";
    io.emit("notification", { message: `${data.content}`, thread });
  } else {
    if (data.aiEnabled) {
      const response = await getAIResponse(
        data.content,
        data.orgId,
        data.aiOrgId,
        data.threadId,
        data?.faqs
      ) as any;
      if (response) {
        if (response?.answer.includes("I'm unable to")) {
          if (online.length > 0) {
            answer = "I'm not able to assist with this, Let me connect you with an agent. Thank you for waiting!";
            io.emit("notification", { message: `${data.content}`, thread });
          } else {
            answer = "I'm unable to assist with this and no agents are available at the moment. Would you like me to create a ticket for your query so someone can get back to you later?";
          }
          question = response.question;
          taskCreation = response.task_creation;
        } else {
          answer = response.answer;
        }
      } else {
        answer = "I'm sorry, but I couldn't process your request.";
      }
    } else if (online.length > 0) {
      if (
        !agentMessageAlreadySent &&
        (
          (!data?.allowNameEmail && isFirstUserMessage) ||
          (data?.allowNameEmail && thread && thread.name !== "" && thread.email !== "") 
        )
      ) {
        answer = "An agent is available and will assist you soon. Thank you for your patience.";
      }
    } else {
      answer = "I apologize, but no agents are available at the moment and AI assistance is not enabled. Would you like me to create a ticket for your query so someone can get back to you later?";
    }
  }
}
  // Always emit a response to clear typing indicator
  const formattedAnswer = Array.isArray(answer) ? answer.map(item => `- ${item}`).join("\n") : answer || "";
  if (formattedAnswer && formattedAnswer.trim() !== "") {
    await prisma.message.create({
      data: { content: formattedAnswer, sender: "Bot", threadId: data.threadId },
    });
  io.emit("receiveMessage", {
    id: Date.now().toString(),
    sender: "Bot",
    status: 200,
    content: formattedAnswer,
    task_creation: taskCreation,
    threadId: data.threadId,
    question,
    createdAt: new Date().toISOString(),
  });
  }
};

export const socketSetup = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("a user connected");  
    socket.on("registerOrg",({ orgId, userId, role })=>{
      socket.join(`org-${orgId}`)
      socketOrgMap.set(socket.id,{orgId,userId,role})
      console.log(`Socket ${socket.id} joined org-${orgId} as ${role}`);
    })

    socket.on("agentOnline", async (agentData) => {
      agentData.online
        ? addOnlineAgent(agentData.id, agentData.name)
        : removeOnlineAgent(agentData.id);
      console.log(
        `Agent ${agentData.name} is ${agentData.online ? "online" : "offline"}`,
        getOnlineAgents()
      );
      await prisma.user.update({
        where: { id: agentData.id },
        data: { online: agentData.online },
      });
       io.to(`org-${agentData.orgId}`).emit("onlineStatus", {
    userId: agentData.id,
    online: agentData.online,
  });
      io.to(`org-${agentData.orgId}`).emit("agentStatusUpdate", getOnlineAgents())
    });

    socket.on("assignThread",async({threadId,agentId,orgId})=>{
      const agent = await prisma.user.findFirst({where:{id:agentId}})
      const isAssigned =await  prisma.thread.findUnique({where:{id:threadId}})
          if(!isAssigned?.assignedTo){
            io.emit("receiveMessage", {
        id: Date.now().toString(),
        sender: "Bot",
        status: 200,
        content: `An agent ${agent?.fullName} has been assigned to you, for further assistance `,
        threadId:threadId,
        createdAt: new Date().toISOString(),
        task_creation: false, 
      });
          await prisma.thread.update({ where: { id: threadId }, data: { assignedTo: agentId, type: "assigned" } })
          }

      io.to(`org-${orgId}`).emit("threadAssigned",{threadId,agentId})
    })

    // socket to move thread to trash 
     socket.on("threadTrash",async({ThreadId,trash,orgId})=>{
      await moveToTrash(ThreadId,trash)
        io.to(`org-${orgId}`).emit("trashThread",{ThreadId,trash})
     })

    socket.on("joinThread", (threadId) => {
      socket.join(threadId);
      console.log(`User joined thread: ${threadId}`);
    });
    socket.on("leaveThread", (threadId) => {
      socket.leave(threadId);
      console.log(`User left thread: ${threadId}`);
    });
    socket.on("joinThreadRoom", ({ threadId }) => {
      socket.join(threadId);
    });

    socket.on("endThread",async({threadId,orgId,ended_by,url,cookie,browserData})=>{
      console.log({threadId,orgId,ended_by})
      await endChatFunction({thread_id:threadId,ended_by:ended_by,url:url,header:cookie,browserData})
      io.emit("threadEnded",{threadId,orgId,ended_by})
    })

    socket.on("typing", ({ threadId, agentName }) =>
      socket.to(threadId).emit("typing", { agentName })
    );

    socket.on("stopTyping", ({ threadId }) =>
      socket.to(threadId).emit("stopTyping")
    );

    socket.on("sendMessage", async (data) => {
  try {
    if (!data.threadId) {
      return socket.emit("error", { message: "Thread ID is required" });
    }

    // Check thread status
    const thread = await prisma.thread.findUnique({
      where: { id: data.threadId },
      select: { status: true },
    });

    if (!thread) {
      return socket.emit("error", { message: "Thread not found" });
    }

    if (thread.status === 'ended') {
      return socket.emit("error", { message: "This chat has been ended. No further messages allowed." });
    }

    // Proceed to store message
    const senderKey = data.sender === "User" ? "User" : "Bot";
        const hasContent = data.content && data.content.trim() !== "";
        const hasFile = data.fileData && (data.fileData.file_url || data.fileData.file_presigned_url);
        if (!hasContent && !hasFile) {
          return; 
        }
        if(data.file){
          await prisma.message.create({
            data:{
              content:`File Uploaded: ${data.content}`,
              fileName:data.fileData.file_name,
              fileType:data.fileData.file_type,
              fileUrl:data.fileData.file_url,
              sender: senderKey,
              threadId: data.threadId,
              createdAt: new Date(data.createdAt),
            }
          });
          // Emit file message to widget with presigned URL
          const presignedUrl = await getPresignedUrl(data.fileData.file_url);
          io.emit("receiveMessage", {
            id: Date.now().toString(),
            sender: senderKey, 
            threadId: data.threadId,
            fileUrl: presignedUrl,
            fileType: data.fileData.file_type,
            fileName: data.fileData.file_name,
            createdAt: new Date().toISOString(),
          });
        }else{
      await prisma.message.create({
      data: {
        content: data.content,
        sender: senderKey,
        threadId: data.threadId,
        createdAt: new Date(data.createdAt),
      },
    });
        }
    // Update lastActivityAt on message send
    await prisma.thread.update({
      where: { id: data.threadId },
      data: { lastActivityAt: new Date() },
    });
    // Skip name/email collection logic
    const fullThread = await prisma.thread.findUnique({
      where: { id: data.threadId },
    });

        io.to(`org-${data.orgId}`).emit("newMessage",{data})
    if (
      data.sender === "User" &&
      data.allowNameEmail &&
      fullThread &&
      ((fullThread.name === "" || fullThread.email === "") || fullThread.email === data?.content)
    ) {
      return;
    }
    // if the agent is assigned return
    if(fullThread?.assignedTo){
      return
    }  

    console.log("Online Agents:", getOnlineAgents());
    await processAIResponse(data, io);

  } catch (error) {
    console.error("Error handling sendMessage:", error);
  }
});


    socket.on("processPendingMessage", async (data) => {
      try {
        if (!data.threadId) {
          return socket.emit("error", { message: "Thread ID is required" });
        }
        await processAIResponse(data, io);
      } catch (error) {
        console.error("Error processing pending message:", error);
      }
    });

    socket.on("createTask", async (data) => {
      createTask(
        data.aiOrgId,
        data.threadId,
        data.name,
        data.email,
        data.query,
        "low",
        data.orgId,
      );
      io.to(`org-${data.orgId}`).emit("taskCreated", data);
    });

    socket.on("readedTask",async(data)=>{
     if(data){
      ReadedTask(data)
      io.emit("taskReaded",data.data)
     }
    })

    socket.on("updateDashboard", async (data) => {
      if (data.sender === "User") {
        const thread = await prisma.thread.findUnique({
          where: { id: data.threadId },
        });
        const tempthread = {...thread,orgId:data.orgId}
        
           
            const isNotification  = await prisma.notification.findFirst({where:{threadId:data.threadId}})
        // if isNotification the update the notification 
        if(isNotification){
            // update notification
            const messages =[...isNotification.message,data.content] 
            await prisma.notification.update({where:{id:isNotification.id},data:{message:messages,latestMessage:data.content}})
        }else{
            // create the notification
            const messages = [data.content]
            await prisma.notification.create({data:{threadId:data.threadId,latestMessage:data.content,message:messages,orgId:data.orgId}}) 
        }
        console.log("Thread-User:-", thread)
        io.to(`org-${data.orgId}`).emit("notification", { message: `${data.content}`, thread:tempthread });
        
      } else {
        try {
          const formattedContent = Array.isArray(data.content)
            ? data.content.map((item: any) => `- ${item}`).join("\n")
            : data.content;
          await prisma.message.create({
            data: {
              content: formattedContent,
              sender: "Bot",
              threadId: data.threadId,
              seen: true
            },
          });
          data.content = formattedContent;
          const room = io.sockets.adapter.rooms.get(data.threadId);
          const userInRoom = room && room.size > 0;
          if (!userInRoom) {
            const thread = await prisma.thread.findUnique({
              where: { id: data.threadId },
            });
            if (thread && thread.email) {
              const subject = "New Message from Support Team";
              const text = formattedContent;
              const organization = await prisma.chatConfig.findFirst({
                where: { aiOrgId: thread.aiOrgId },
                select: { emailConfig: true },
              });

              if (organization && organization.emailConfig) {
                await sendEmailChat(
                  thread.email,
                  text,
                  subject,
                  organization.emailConfig
                );
              }
            } else {
              console.log("No email found for thread:", data.threadId);
            }
          }
          io.emit("receiveMessage", {
            id: Date.now().toString(),
            sender: "Bot",
            content: formattedContent,
            threadId: data.threadId,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Error storing agent message:", error);
        }
      }
      io.to(`org-${data.orgId}}`).emit("updateDashboard", data);
    });

    socket.on("readMessage",async(data)=>{
      if(data){
        await prisma.message.updateMany({where:{threadId:data.threadId, seen:false},data:{seen:true}})
      }
    })

    socket.on("threadSeen",(data)=>{
      io.to(`org-${data.orgId}`).emit("seenThread",{data})
    })

    socket.on("startChat", async (data) => {
//       let name=""
//       let email=""
//       for (const [key, value] of Object.entries(data.sessionStorage)) {
//   if (key.toLowerCase().includes("name")) name = value as string;
//   if (key.toLowerCase().includes("email")) email = value as string;
// }

// for (const [key, value] of Object.entries(data.locaStorage)) {
//   if (key.toLowerCase().includes("name")) name = value as string;
//   if (key.toLowerCase().includes("email")) email = value as string;
// }
      try {
        
        const thread = await prisma.thread.create({
          data: {
            user: data.sender,
            aiOrgId: data.aiOrgId,
            url: data.url,
            ip: data.ip,
            name: data.name,
            email: data.email,
          },
        });
        socket.join(thread.id);
        socket.emit("chatStarted", { threadId: thread.id });
        io.to(`org-${data.orgId}`).emit("chatStarted",{thread:thread})
      } catch (error) {
        console.error("Error starting chat:", error);
      }
    });

    socket.on("updateThreadInfo", async (data) => {
      try {
        let updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;

        const updatedThread = await prisma.thread.update({
          where: { id: data.threadId },
          data: updateData,
        });
        console.log("Thread updated successfully:", updatedThread);
      } catch (error) {
        console.error("Error updating thread info:", error);
      }
    });

    socket.on("fetchMessages", async (data) => {
      try {
        const messages = await prisma.message.findMany({
          where: { threadId: data.threadId },
          orderBy: { createdAt: "asc" },
        });
        socket.emit("previousMessages", { threadId: data.threadId, messages });
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    });

    socket.on("recover", () => console.log("Socket connection recovered"));

    socket.on("disconnect", async () => {
      console.log("A user disconnected");
      const agentId = socket.id;
       const orgInfo = socketOrgMap.get(socket.id);
       if (orgInfo) {
       console.log(`Removing user ${orgInfo.userId} from org-${orgInfo.orgId}`);
       socketOrgMap.delete(socket.id);
       }
      if (onlineAgents.has(agentId)) {
        
        const agentName = onlineAgents.get(agentId);
        console.log(`Agent ${agentName} (${agentId}) is offline`);
        removeOnlineAgent(agentId);
        await prisma.user.update({
          where: { id: agentId },
          data: { online: false },
        });
        const org = await prisma.user.findUnique({where:{id:agentId}})
        io.to(`org-${org?.orgId}`).emit("agentStatusUpdate", getOnlineAgents());
      }
    });
  });
};
