import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

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
      case 'chat-volume':
        return await getChatVolumeData(req, res, user);
      case 'ai-effectiveness':
        return await getAIEffectivenessData(req, res, user);
      case 'chat-status-breakdown':
        return await getChatStatusBreakdown(req, res, user);
      case 'top-chat-intents':
        return await getTopChatIntents(req, res, user);
      case 'customer-satisfaction':
        return await getCustomerSatisfactionSummary(req, res, user);
      case 'email-transcript-count':
        return await getEmailTranscriptCount(req, res, user);
      default:
        return res.status(400).json({
          code: 400,
          message: "Invalid analytics type. Use: stats, chat-volume, ai-effectiveness, chat-status-breakdown, top-chat-intents, customer-satisfaction, or email-transcript-count"
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
    console.log("totalChatsCurrent", totalChatsCurrent);



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
    console.log("totalChatsPrevious", totalChatsPrevious);


    // Chats with Agent 
    const agentChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: { not: null },
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("agentChatsCurrent", agentChatsCurrent);


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
    console.log("agentChatsPrevious", agentChatsPrevious);


    // AI Chats (unassigned threads - handled by AI)
    const aiChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: null,
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("aiChatsCurrent", aiChatsCurrent);


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
    console.log("aiChatsPrevious", aiChatsPrevious);


    // Completed Chats (ended status)
    const completedChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        status: "ended",
        createdAt: { gte: currentPeriodStart }
      }
    });
    console.log("completedChatsCurrent", completedChatsCurrent);


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
    console.log("completedChatsPrevious", completedChatsPrevious);


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
const getChatVolumeData = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    // Get data for the last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const chatVolumeData = [];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const total = await prisma.thread.count({
        where: {
          aiOrgId: user.aiOrgId,
          type: { not: "trash" },
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      const ai = await prisma.thread.count({
        where: {
          aiOrgId: user.aiOrgId,
          type: { not: "trash" },
          assignedTo: null,
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      const agent = await prisma.thread.count({
        where: {
          aiOrgId: user.aiOrgId,
          type: { not: "trash" },
          assignedTo: { not: null },
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      chatVolumeData.push({
        date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        total,
        ai,
        agent
      });
    }

    res.status(200).json({
      code: 200,
      data: chatVolumeData,
      message: "Chat volume data retrieved successfully"
    });

  } catch (err) {
    console.error("Error fetching chat volume data:", err);
    res.status(500).json({ code: 500, message: "Error fetching chat volume data" });
  }
};

const getAIEffectivenessData = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    // Get current month data
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total AI chats (unassigned threads)
    const totalAIChats = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: null,
        createdAt: { gte: monthStart }
      }
    });

    // AI chats that were later assigned to agent (failed AI handling)
    const failedToAgent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: { not: null },
        createdAt: { gte: monthStart }
      }
    });

    // AI chats that ended up as tickets (failed completely)
    const failedToTicket = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: "ticket",
        createdAt: { gte: monthStart }
      }
    });

    // Successful AI chats (completed without assignment)
    const successfulAI = totalAIChats - failedToAgent - failedToTicket;

    const effectivenessData = [
      { name: "Answered by AI", value: Math.max(0, successfulAI) },
      { name: "Failed → Agent", value: failedToAgent },
      { name: "Failed → Ticket", value: failedToTicket }
    ];

    res.status(200).json({
      code: 200,
      data: effectivenessData,
      message: "AI effectiveness data retrieved successfully"
    });

  } catch (err) {
    console.error("Error fetching AI effectiveness data:", err);
    res.status(500).json({ code: 500, message: "Error fetching AI effectiveness data" });
  }
};

const getChatStatusBreakdown = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    const { startDate, endDate } = req.query;

    // Parse date range or use default (current month)
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
    } else {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = {
        createdAt: { gte: monthStart }
      };
    }

    // Get counts for each status
    const completed = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        status: "ended",
        ...dateFilter
      }
    });

    const open = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        status: "active",
        ...dateFilter
      }
    });

    const trashed = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: "trash",
        ...dateFilter
      }
    });

    const statusBreakdown = [
      { status: "Completed", count: completed },
      { status: "Open", count: open },
      { status: "Trashed", count: trashed },
    ];

    res.status(200).json({
      code: 200,
      data: statusBreakdown,
      message: "Chat status breakdown retrieved successfully"
    });

  } catch (err) {
    console.error("Error fetching chat status breakdown:", err);
    res.status(500).json({ code: 500, message: "Error fetching chat status breakdown" });
  }
};

const getTopChatIntents = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    const { limit = 10 } = req.query;

    const intents = await prisma.chatSummary.groupBy({
      by: ['intent'],
      where: {
        thread: {
          aiOrgId: user.aiOrgId
        }
      },
      _count: {
        intent: true
      },
      orderBy: {
        _count: {
          intent: 'desc'
        }
      },
      take: parseInt(limit as string)
    });

    const totalIntents = await prisma.chatSummary.count({
      where: {
        thread: {
          aiOrgId: user.aiOrgId
        }
      }
    });

    const topIntents = intents.map(intent => ({
      intent: intent.intent || 'Unknown',
      count: intent._count.intent,
      percentage: totalIntents > 0 ? ((intent._count.intent / totalIntents) * 100).toFixed(1) : '0'
    }));

    res.status(200).json({
      code: 200,
      data: {
        intents: topIntents,
        total: totalIntents
      },
      message: "Top chat intents retrieved successfully"
    });

  } catch (err) {
    console.error("Error fetching top chat intents:", err);
    res.status(500).json({ code: 500, message: "Error fetching top chat intents" });
  }
};

const getCustomerSatisfactionSummary = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    const { minScore } = req.query;

    let scoreFilter = {};
    if (minScore) {
      scoreFilter = {
        satisfactionScore: {
          gte: parseInt(minScore as string)
        }
      };
    }

    const satisfactionScores = await prisma.chatSummary.groupBy({
      by: ['satisfactionScore'],
      where: {
        thread: {
          aiOrgId: user.aiOrgId
        },
        ...scoreFilter
      },
      _count: {
        satisfactionScore: true
      },
      orderBy: {
        satisfactionScore: 'asc'
      }
    });

    // Calculate average satisfaction score
    const avgSatisfaction = await prisma.chatSummary.aggregate({
      where: {
        thread: {
          aiOrgId: user.aiOrgId
        },
        ...scoreFilter
      },
      _avg: {
        satisfactionScore: true
      }
    });

    const getEmoji = (score: number): string => {
      if (score <= 2) return '😡';
      if (score <= 3) return '😐';
      return '😊';
    };

    const scoreBreakdown = satisfactionScores.map(score => ({
      score: score.satisfactionScore,
      count: score._count.satisfactionScore,
      emoji: getEmoji(score.satisfactionScore)
    }));

    res.status(200).json({
      code: 200,
      data: {
        averageScore: avgSatisfaction._avg.satisfactionScore?.toFixed(1) || '0',
        scoreBreakdown,
        totalChats: scoreBreakdown.reduce((sum, item) => sum + item.count, 0)
      },
      message: "Customer satisfaction summary retrieved successfully"
    });

  } catch (err) {
    console.error("Error fetching customer satisfaction summary:", err);
    res.status(500).json({ code: 500, message: "Error fetching customer satisfaction summary" });
  }
};


const getEmailTranscriptCount = async (req: Request, res: Response, user: any): Promise<any> => {
  try {
    const { startDate, endDate, download } = req.query;

    // Parse date range or use default (current month)
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
    } else {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = {
        createdAt: { gte: monthStart }
      };
    }


    const emailTranscripts = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        email: { not: "" },
        ...dateFilter
      }
    });

    res.status(200).json({
      code: 200,
      data: {
        count: emailTranscripts,
      },
      message: "Email transcript count retrieved successfully"
    });

  } catch (err) {
    console.error("Error fetching email transcript count:", err);
    res.status(500).json({ code: 500, message: "Error fetching email transcript count" });
  }
}; 