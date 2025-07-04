import { Router } from 'express';
import { createFAQ } from '../controllers/faq.controller';
const router = Router();
router.post('/faqs/manual', createFAQ); 
export default router;