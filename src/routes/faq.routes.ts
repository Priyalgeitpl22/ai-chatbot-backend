import { Router } from 'express';
import { createFAQ, getFAQsByOrgId } from '../controllers/faq.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/create', authMiddleware, createFAQ); 
router.get('/:orgId', authMiddleware, getFAQsByOrgId);
export default router;