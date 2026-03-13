import { Router } from 'express';
import { getPlans, getPlanByCode } from '../controllers/plans.controller';


const router = Router();

router.get('/', getPlans);
router.get('/:code', getPlanByCode);

export default router;