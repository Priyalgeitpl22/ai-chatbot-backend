import { Router } from 'express';
import { createFAQ, getFAQsByOrgId, updateFAQStatus } from '../controllers/faq.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadFaqFile } from '../controllers/faq.controller';
import { faqFileUpload } from '../middlewares/faqUpload.middleware';
import { getPresignedUrlHandler } from '../controllers/faq.controller'


const router = Router();

router.post('/create', authMiddleware, createFAQ);
router.get('/:orgId', authMiddleware, getFAQsByOrgId);
router.post('/faq-files', authMiddleware, faqFileUpload, uploadFaqFile);
router.get('/faq-files/presigned-url/:fileKey', authMiddleware, getPresignedUrlHandler);
router.put('/:id', authMiddleware, updateFAQStatus);
export default router;