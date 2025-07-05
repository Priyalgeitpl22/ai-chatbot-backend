import { Router } from 'express';
import { createFAQ } from '../controllers/faq.controller';
const router = Router();
router.post('/create', createFAQ); 
export default router;