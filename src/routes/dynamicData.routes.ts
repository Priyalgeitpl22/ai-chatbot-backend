import { Router } from 'express';
import {
  createDynamicData,
  getDynamicData,
  getDynamicDataById,
  updateDynamicData,
  deleteDynamicData,
} from '../controllers/dynamicData.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.post('/create', createDynamicData);
router.get('/:orgId', getDynamicDataById);
router.put('/:orgId', updateDynamicData);
router.delete('/:orgId', deleteDynamicData);

export default router;
