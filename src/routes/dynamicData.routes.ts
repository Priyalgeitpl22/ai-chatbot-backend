import { Router } from 'express';
import {
  createDynamicData,
  getDynamicDataById,
  updateDynamicData,
  deleteDynamicData,
} from '../controllers/dynamicData.controller';
import { authMiddleware } from '../middlewares/authMiddleware';
import { enforcePlanLimits } from '../middlewares/enforcePlanLimits';

const router = Router();

// All routes require authentication
router.post('/create', authMiddleware,enforcePlanLimits, createDynamicData);
router.get('/:orgId', authMiddleware, getDynamicDataById);
router.put('/:orgId', authMiddleware, updateDynamicData);
router.delete('/:id', authMiddleware, deleteDynamicData);

export default router;
