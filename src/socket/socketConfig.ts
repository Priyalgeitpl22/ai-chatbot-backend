import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { getAIResponse } from "../middlewares/botMiddleware";
import { UserRoles } from "../enums";

const prisma = new PrismaClient();
export const onlineAgents = new Map<string, string>(); // Map<agentId, agentName>

export const addOnlineAgent = (agentId: string, agentName: string) => {
  onlineAgents.set(agentId, agentName);
};

export const removeOnlineAgent = (agentId: string) => {
  onlineAgents.delete(agentId);
};

export const getOnlineAgents = () => {
  return Array.from(onlineAgents.entries()).map(([id, name]) => ({ id, name }));
};

export const socketSetup = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("agentOnline", async (agentData) => {
      if (agentData.online) {
        addOnlineAgent(agentData.id, agentData.name);
        const onlineAgent = getOnlineAgents();

        console.log(`Agent ${agentData.name} is online`);
        console.log(onlineAgent);
      } else {
        removeOnlineAgent(agentData.id);
        const onlineAgent = getOnlineAgents();

        console.log(`Agent ${agentData.name} is offline`);
        console.log(onlineAgent);
      }
    
      await prisma.user.update({
        where: { id: agentData.id },
        data: { online: agentData.online },
      });
    
      const onlineAgent = getOnlineAgents();
      io.emit("agentStatusUpdate", onlineAgent);
    });
    
    socket.on("joinThread", (threadId) => {
      socket.join(threadId);
      console.log(`User joined thread: ${threadId}`);
    });

    socket.on("typing", ({ threadId, agentName }) => {
      socket.to(threadId).emit("typing", { agentName });
    });
  
    socket.on("stopTyping", ({ threadId }) => {
      socket.to(threadId).emit("stopTyping");
    });

    socket.on("sendMessage", async (data) => {
      try {
        if (!data.threadId) {
          return socket.emit("error", { message: "Thread ID is required" });
        }

        await prisma.message.create({
          data: { content: data.content, sender: data.sender, threadId: data.threadId },
        });

        const onlineAgents = getOnlineAgents();
        console.log("Online Agents:", onlineAgents);

        let answer, taskCreation;
        let question = data.content;

        const previousMessages = await prisma.message.findMany({
          where: { threadId: data.threadId },
        });

        const isFirstUserMessage = previousMessages.length === 1;

        if (onlineAgents.length > 0) {
          if (isFirstUserMessage) {
            answer = "An agent is available and will assist you soon. Thank you for your patience.";
          }
        } else {
          const response = await getAIResponse(data.content, data.orgId, data.aiOrgId, data.threadId);
          if (response) {
            answer = response.answer;
            question = response.question;
            taskCreation = response.task_creation;
          } else {
            answer = "I'm sorry, but I couldn't process your request.";
          }
        }

        if (answer) {
          await prisma.message.create({
            data: { content: answer, sender: "Bot", threadId: data.threadId },
          });

          if(data.sender === 'User') {
            io.emit("notification", { message: "🔔 New Message Received!" });
          }

          io.emit("receiveMessage", {
            id: Date.now().toString(),
            sender: "Bot",
            status: 200,
            content: answer,
            task_creation: taskCreation,
            threadId: data.threadId,
            question,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("Error handling sendMessage:", error);
      }
    });

    socket.on("updateDashboard", (data) => {
      if(data.sender === 'User') {
        io.emit("notification", { message: "🔔 New Message Received!" });
      }
      io.emit("updateDashboard", data);
    });

    socket.on("startChat", async (data) => {
      try {
        const thread = await prisma.thread.create({
          data: { user: data.sender, aiOrgId: data.aiOrgId },
        });

        socket.join(thread.id);
        io.emit("notification", { message: "🔔 New Chat Initated!" });
        socket.emit("chatStarted", { threadId: thread.id });
      } catch (error) {
        console.error("Error starting chat:", error);
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

    socket.on("recover", () => {
      console.log("Socket connection recovered");
    });

    socket.on("disconnect", async () => {
      console.log("A user disconnected");

      const agentId = socket.id;
      if (onlineAgents.has(agentId)) {
        const agentName = onlineAgents.get(agentId);
        console.log(`Agent ${agentName} (${agentId}) is offline`);

        removeOnlineAgent(agentId);
        
        const onlineAgent = getOnlineAgents();
        console.log(onlineAgent);

        await prisma.user.update({
          where: { id: agentId },
          data: { online: false },
        });

        io.emit("agentStatusUpdate", onlineAgent);
      }
    });
  });
};
