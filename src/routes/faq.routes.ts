import { Router } from 'express';
import { createFAQ, getFAQsByOrgId } from '../controllers/faq.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadFaqFile } from '../controllers/faq.controller'

const router = Router();

router.post('/create', authMiddleware, createFAQ); 
router.get('/:orgId', authMiddleware, getFAQsByOrgId);

const storage = multer.memoryStorage(); // Use memory storage for S3

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed.'));
    }
  },
});


router.post('/faq-files',authMiddleware, upload.single('file'),uploadFaqFile);

export default router;