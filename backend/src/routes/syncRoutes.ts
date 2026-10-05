import { Router } from 'express';
import { pushFullSync, pullFullSync } from '../controllers/syncController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/push', authenticateToken, pushFullSync);
router.get('/pull', authenticateToken, pullFullSync);

export default router;
