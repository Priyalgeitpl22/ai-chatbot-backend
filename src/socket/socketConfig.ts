import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { getAIResponse } from "../middlewares/botMiddleware";
import { createTask } from "../controllers/task.controller";

const prisma = new PrismaClient();
export const onlineAgents = new Map<string, string>(); // Map<agentId, agentName>

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

  const previousMessages = await prisma.message.findMany({
    where: { threadId: data.threadId },
  });
  const isFirstUserMessage =
    previousMessages.filter((m) => m.sender === "User").length === 1;

  const thread = await prisma.thread.findUnique({
    where: { id: data.threadId },
  });

  const agentMessageAlreadySent = previousMessages.some(
    (m) => m.sender === "Bot" && m.content === "An agent is available and will assist you soon. Thank you for your patience."
  );
  if (online.length > 0) {
    if ((!data?.allowNameEmail && isFirstUserMessage) ||
      (data?.allowNameEmail && thread && thread.name !== "" && thread.email !== "" && !agentMessageAlreadySent)
    ) {
      answer =
        "An agent is available and will assist you soon. Thank you for your patience.";
    }
  }
  else if (online.length === 0) {
    if (data.sender === 'User') {
      const response = await getAIResponse(
        data.content,
        data.orgId,
        data.aiOrgId,
        data.threadId
      );
      if (response) {
        answer = response.answer;
        question = response.question;
        taskCreation = response.task_creation;
      } else {
        answer = "I'm sorry, but I couldn't process your request.";
      }
    }
  }
  console.log("answer:", answer);
  if (answer) {
    await prisma.message.create({
      data: { content: answer, sender: "Bot", threadId: data.threadId },
    });
    if (data.sender === "User") {
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
};

export const socketSetup = (server: any) => {
  const io = new Server(server, {
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
      io.emit("agentStatusUpdate", getOnlineAgents());
    });

    socket.on("joinThread", (threadId) => {
      socket.join(threadId);
      console.log(`User joined thread: ${threadId}`);
    });

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
        const senderKey = data.sender === "User" ? "User" : "Bot";
        // Save every incoming message.
        await prisma.message.create({
          data: {
            content: data.content,
            sender: senderKey,
            threadId: data.threadId,
          },
        });

        const thread = await prisma.thread.findUnique({
          where: { id: data.threadId },
        });
        if (
          data.sender === "User" &&
          data.allowNameEmail &&
          thread &&
          ((thread.name === "" || thread.email === "") || thread.email === data?.content)
        ) {
          return;
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
        const thread = await prisma.thread.findUnique({
          where: { id: data.threadId },
        });
        // if (!thread || thread.name === "" || thread.email === "") {
        //   console.log("User identification incomplete. Skipping AI processing.");
        //   return;
        // }
        console.log("Processing pending message:", data.content);
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
        "low"
      );
      io.emit("taskCreated", data);
    });

    socket.on("updateDashboard", async (data) => {
      if (data.sender === "User") {
        io.emit("notification", { message: "🔔 New Message Received!" });
      } else {
        try {
          await prisma.message.create({
            data: {
              content: data.content,
              sender: "Bot", 
              threadId: data.threadId,
            },
          });
        } catch (error) {
          console.error("Error storing agent message:", error);
        }
      }
      io.emit("updateDashboard", data);
    });


    socket.on("startChat", async (data) => {
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
        io.emit("notification", { message: "🔔 New Chat Initiated!" });
        socket.emit("chatStarted", { threadId: thread.id });
      } catch (error) {
        console.error("Error starting chat:", error);
      }
    });

    socket.on("updateThreadInfo", async (data) => {
      try {
        let updateData:any = {};
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
      if (onlineAgents.has(agentId)) {
        const agentName = onlineAgents.get(agentId);
        console.log(`Agent ${agentName} (${agentId}) is offline`);
        removeOnlineAgent(agentId);
        await prisma.user.update({
          where: { id: agentId },
          data: { online: false },
        });
        io.emit("agentStatusUpdate", getOnlineAgents());
      }
    });
  });
};
