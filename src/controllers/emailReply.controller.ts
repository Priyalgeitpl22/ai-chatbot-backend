import { Request, Response } from 'express';
import { emailReplyMonitor } from '../utils/emailReplyMonitor';
import { emailReplyCronService } from '../utils/emailReplyCron';

export const processEmailReplies = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Manual email reply processing triggered');
    await emailReplyMonitor.processEmailReplies();
    
    res.status(200).json({
      code: 200,
      message: 'Email replies processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing email replies:', error);
    res.status(500).json({
      code: 500,
      message: 'Error processing email replies',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getEmailReplyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = emailReplyCronService.getStatus();
    
    res.status(200).json({
      code: 200,
      data: {
        cronJob: status,
        lastChecked: new Date().toISOString()
      },
      message: 'Email reply status retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting email reply status:', error);
    res.status(500).json({
      code: 500,
      message: 'Error getting email reply status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const startEmailReplyCron = async (req: Request, res: Response): Promise<void> => {
  try {
    emailReplyCronService.start();
    
    res.status(200).json({
      code: 200,
      message: 'Email reply cron job started successfully'
    });
  } catch (error) {
    console.error('Error starting email reply cron:', error);
    res.status(500).json({
      code: 500,
      message: 'Error starting email reply cron',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const stopEmailReplyCron = async (req: Request, res: Response): Promise<void> => {
  try {
    emailReplyCronService.stop();
    
    res.status(200).json({
      code: 200,
      message: 'Email reply cron job stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping email reply cron:', error);
    res.status(500).json({
      code: 500,
      message: 'Error stopping email reply cron',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
