import { Router } from 'express';
import {
  createDynamicData,
  getDynamicDataById,
  updateDynamicData,
  deleteDynamicData,
} from '../controllers/dynamicData.controller';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.post('/create', authMiddleware, createDynamicData);
router.get('/:orgId', authMiddleware, getDynamicDataById);
router.put('/:orgId', authMiddleware, updateDynamicData);
router.delete('/:id', authMiddleware, deleteDynamicData);

export default router;
