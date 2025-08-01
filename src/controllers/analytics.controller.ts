import { PrismaClient } from "@prisma/client";
import { log } from "console";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Main analytics controller that routes to different functions based on query parameter
export const getAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const { type } = req.query;
    const user = (req as any).user;

    if (!user) {
      return res.status(400).json({ code: 400, message: "Invalid user" });
    }

    switch (type) {
      case 'stats':
        return await getDashboardStats(req, res, user);
      // case 'chat-volume':
      //   return await getChatVolumeData(req, res, user);
      // case 'ai-effectiveness':
      //   return await getAIEffectivenessData(req, res, user);
      default:
        return res.status(400).json({ 
          code: 400, 
          message: "Invalid analytics type. Use: stats, chat-volume, or ai-effectiveness" 
        });
    }
  } catch (err) {
    console.error("Error in analytics controller:", err);
    res.status(500).json({ code: 500, message: "Error processing analytics request" });
  }
};

const getDashboardStats = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Start of previous month
    const previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // End of previous month

    // Total Chats (excluding trashed threads)
    const totalChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("totalChatsCurrent",totalChatsCurrent);
    


    const totalChatsPrevious = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        createdAt: { 
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      }
    });
    console.log("totalChatsPrevious",totalChatsPrevious);
    

    // Chats with Agent 
    const agentChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: { not: null },
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("agentChatsCurrent",agentChatsCurrent);
    

    const agentChatsPrevious = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: { not: null },
        createdAt: { 
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      }
    });
    console.log("agentChatsPrevious",agentChatsPrevious);
    

    // AI Chats (unassigned threads - handled by AI)
    const aiChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: null,
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("aiChatsCurrent",aiChatsCurrent);
    

    const aiChatsPrevious = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: null,
        createdAt: { 
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      }
    });
    console.log("aiChatsPrevious",aiChatsPrevious);
    

    // Completed Chats (ended status)
    const completedChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        status: "ended",
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("completedChatsCurrent",completedChatsCurrent);
    

    const completedChatsPrevious = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        status: "ended",
        createdAt: { 
          gte: previousPeriodStart,
          lte: previousPeriodEnd
        }
      }
    });
    console.log("completedChatsPrevious",completedChatsPrevious);
    

    // Calculate trends
    const calculateTrend = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const percentage = ((current - previous) / previous) * 100;
      return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    };

    const stats = {
      totalChats: {
        value: totalChatsCurrent,
        trend: calculateTrend(totalChatsCurrent, totalChatsPrevious)
      },
      agentChats: {
        value: agentChatsCurrent,
        trend: calculateTrend(agentChatsCurrent, agentChatsPrevious)
      },
      aiChats: {
        value: aiChatsCurrent,
        trend: calculateTrend(aiChatsCurrent, aiChatsPrevious)
      },
      completedChats: {
        value: completedChatsCurrent,
        trend: calculateTrend(completedChatsCurrent, completedChatsPrevious)
      }
    };

    res.status(200).json({ 
      code: 200, 
      data: stats, 
      message: "Dashboard stats retrieved successfully" 
    });

  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res.status(500).json({ code: 500, message: "Error fetching dashboard stats" });
  }
};

// Chat volume data function
// const getChatVolumeData = async (req: Request, res: Response, user: any): Promise<any> => {
//   try {
//     // Get data for the last 7 days
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(startDate.getDate() - 7);

//     const chatVolumeData = [];

//     for (let i = 0; i < 7; i++) {
//       const currentDate = new Date(startDate);
//       currentDate.setDate(startDate.getDate() + i);
      
//       const dayStart = new Date(currentDate);
//       dayStart.setHours(0, 0, 0, 0);
      
//       const dayEnd = new Date(currentDate);
//       dayEnd.setHours(23, 59, 59, 999);

//       const total = await prisma.thread.count({
//         where: {
//           aiOrgId: user.aiOrgId,
//           type: { not: "trash" },
//           createdAt: { gte: dayStart, lte: dayEnd }
//         }
//       });

//       const ai = await prisma.thread.count({
//         where: {
//           aiOrgId: user.aiOrgId,
//           type: { not: "trash" },
//           assignedTo: null,
//           createdAt: { gte: dayStart, lte: dayEnd }
//         }
//       });

//       const agent = await prisma.thread.count({
//         where: {
//           aiOrgId: user.aiOrgId,
//           type: { not: "trash" },
//           assignedTo: { not: null },
//           createdAt: { gte: dayStart, lte: dayEnd }
//         }
//       });

//       chatVolumeData.push({
//         date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
//         total,
//         ai,
//         agent
//       });
//     }

//     res.status(200).json({ 
//       code: 200, 
//       data: chatVolumeData, 
//       message: "Chat volume data retrieved successfully" 
//     });

//   } catch (err) {
//     console.error("Error fetching chat volume data:", err);
//     res.status(500).json({ code: 500, message: "Error fetching chat volume data" });
//   }
// };

// // AI effectiveness data function
// const getAIEffectivenessData = async (req: Request, res: Response, user: any): Promise<any> => {
//   try {
//     // Get current month data
//     const now = new Date();
//     const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

//     // Total AI chats (unassigned threads)
//     const totalAIChats = await prisma.thread.count({
//       where: {
//         aiOrgId: user.aiOrgId,
//         type: { not: "trash" },
//         assignedTo: null,
//         createdAt: { gte: monthStart }
//       }
//     });

//     // AI chats that were later assigned to agent (failed AI handling)
//     const failedToAgent = await prisma.thread.count({
//       where: {
//         aiOrgId: user.aiOrgId,
//         type: { not: "trash" },
//         assignedTo: { not: null },
//         createdAt: { gte: monthStart }
//       }
//     });

//     // AI chats that ended up as tickets (failed completely)
//     const failedToTicket = await prisma.thread.count({
//       where: {
//         aiOrgId: user.aiOrgId,
//         type: "ticket",
//         createdAt: { gte: monthStart }
//       }
//     });

//     // Successful AI chats (completed without assignment)
//     const successfulAI = totalAIChats - failedToAgent - failedToTicket;

//     const effectivenessData = [
//       { name: "Answered by AI", value: Math.max(0, successfulAI) },
//       { name: "Failed → Agent", value: failedToAgent },
//       { name: "Failed → Ticket", value: failedToTicket }
//     ];

//     res.status(200).json({ 
//       code: 200, 
//       data: effectivenessData, 
//       message: "AI effectiveness data retrieved successfully" 
//     });

//   } catch (err) {
//     console.error("Error fetching AI effectiveness data:", err);
//     res.status(500).json({ code: 500, message: "Error fetching AI effectiveness data" });
//   }
// }; 