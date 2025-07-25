// import { PrismaClient } from '@prisma/client';
// import { createTask } from '../controllers/task.controller';
// import { io } from "../socket/socketConfig";

// const prisma = new PrismaClient();

// // Inactivity thresholds (in ms)
// const THREAD_IDLE_TIMEOUT = 1 * 60 * 1000; 
// const AGENT_RESPONSE_TIMEOUT = 1 * 60 * 1000; 

// export const startInactivityJob = () => {
//   setInterval(async () => {
//     const now = new Date();
//     // Find all active threads
//     const activeThreads = await prisma.thread.findMany({
//       where: { status: 'active' },
//       include: { messages: true },
//     });

//     for (const thread of activeThreads) {
//       if (!thread.lastActivityAt) continue;
//       const lastActivity = new Date(thread.lastActivityAt).getTime();
//       const idleTime = now.getTime() - lastActivity;

//       //check if thread is idle for more than minutes
//       if (idleTime > THREAD_IDLE_TIMEOUT) {
//         await autoEndAndCreateTicket(thread, 'idle_timeout', now);
//         continue;
//       }

//       // 2. Check for no agent response within min of last user message
//       const userMessages = thread.messages.filter(m => m.sender === 'User');
//       if (userMessages.length > 0) {
//         const lastUserMsg = userMessages[userMessages.length - 1];
//         const lastUserMsgTime = new Date(lastUserMsg.createdAt).getTime();
//         // Find if any agent/bot message after last user message
//         const agentReply = thread.messages.find(
//           m => (m.sender === 'Bot' || m.sender === 'Agent') && new Date(m.createdAt).getTime() > lastUserMsgTime
//         );
//         if (!agentReply && (now.getTime() - lastUserMsgTime > AGENT_RESPONSE_TIMEOUT)) {
//           await autoEndAndCreateTicket(thread, 'no_agent_response', now);
//         }
//       }
//     }
//   }, 60 * 1000); // Run every 1 minute
// };

// async function autoEndAndCreateTicket(thread: any, reason: string, triggerTime: Date) {
//   // End the chat and set status to ticket_created
//   await prisma.thread.update({
//     where: { id: thread.id },
//     data: {
//       status: 'ticket_created',
//       endedBy: null,
//       endedAt: triggerTime,
//     },
//   });

//   // Emit socket event to notify clients
//   io.to(thread.id).emit("threadStatusUpdated", {
//     threadId: thread.id,
//     status: "ticket_created",
//   });

//   // Create a ticket (Task)
//   const lastMessages = thread.messages.slice(-10); // last 10 messages
//   await createTask(
//     thread.aiOrgId,
//     thread.id,
//     thread.name,
//     thread.email,
//     lastMessages.map((m: any) => `[${m.sender}] ${m.content}`).join('\n'),
//     'low',
//     thread.orgId || ''
//   );
//   // Optionally: log or notify
//   console.log(`Auto-ended thread ${thread.id} due to ${reason} at ${triggerTime.toISOString()}`);
// } 