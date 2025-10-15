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
        type: { not: "trash" }
      }
    });


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


    // Chats with Agent 
    const agentChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: { not: null }
      }
    });


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


    // AI Chats (unassigned threads - handled by AI)
    const aiChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: null
      }
    });


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


    // Completed Chats (ended status)
    const completedChatsCurrent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        status: "ended"
      }
    });


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
    const { startDate, endDate, period } = req.query;

    let dateRange: { start: Date; end: Date };
    let daysToShow: number;

    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
      daysToShow = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      const end = new Date();
      let start = new Date();

      switch (period) {
        case '7days':
          start.setDate(start.getDate() - 7);
          daysToShow = 7;
          break;
        case '30days':
          start.setDate(start.getDate() - 30);
          daysToShow = 30;
          break;
        case '90days':
          start.setDate(start.getDate() - 90);
          daysToShow = 90;
          break;
        default:
          start.setDate(start.getDate() - 7);
          daysToShow = 7;
      }

      dateRange = { start, end };
    }

    const chatVolumeData = [];

    for (let i = 0; i < daysToShow; i++) {
      const currentDate = new Date(dateRange.start);
      currentDate.setDate(dateRange.start.getDate() + i);

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
    const { period } = req.query;

    // use default (all time)
    let dateFilter = {};
    if (period) {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          // No date filter for all time
          dateFilter = {};
          break;
      }

      if (period !== 'all') {
        dateFilter = {
          createdAt: { gte: startDate }
        };
      }
    }

    // Total AI chats (unassigned threads)
    const totalAIChats = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: null,
        ...dateFilter
      }
    });

    // AI chats that were later assigned to agent (failed AI handling)
    const failedToAgent = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: { not: "trash" },
        assignedTo: { not: null },
        ...dateFilter
      }
    });

    // AI chats that ended up as tickets (failed completely)
    const failedToTicket = await prisma.thread.count({
      where: {
        aiOrgId: user.aiOrgId,
        type: "ticket",
        ...dateFilter
      }
    });

    const successfulAI = totalAIChats - failedToAgent - failedToTicket;

    const effectivenessData = [
      { name: "Answered by AI", value: Math.max(0, successfulAI) },
      { name: "Agent", value: failedToAgent },
      { name: "Ticket", value: failedToTicket }
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

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
    } else {
      dateFilter = {};
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

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      };
    } else {
      dateFilter = {};
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