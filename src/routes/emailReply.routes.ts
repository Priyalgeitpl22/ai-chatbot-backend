import { Router } from 'express';
import { 
  processEmailReplies, 
  getEmailReplyStatus, 
  startEmailReplyCron, 
  stopEmailReplyCron 
} from '../controllers/emailReply.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Process email replies manually
router.post('/process', processEmailReplies);

// Get email reply cron status
router.get('/status', getEmailReplyStatus);

// Start email reply cron job
router.post('/cron/start', startEmailReplyCron);

// Stop email reply cron job
router.post('/cron/stop', stopEmailReplyCron);

export default router;
