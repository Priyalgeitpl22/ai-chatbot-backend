import { Router } from 'express';
import { generateTOTP, verifyTOTP, disableTOTP, userProfile } from '../controllers/security.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
router.get('/user/profile', authMiddleware, userProfile);

router.get('/2fa/setup', authMiddleware, generateTOTP);
router.post('/2fa/verify', authMiddleware, verifyTOTP);
router.post('/2fa/disable', authMiddleware, disableTOTP);

export default router;
