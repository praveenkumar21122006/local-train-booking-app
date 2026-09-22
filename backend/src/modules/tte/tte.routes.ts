import { Router } from 'express';
import { verifyTicket, markUsed } from './tte.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
const router = Router();
router.post('/verify', authenticate, verifyTicket); // allow any authenticated for demo; in prod authorize('TTE','ADMIN')
router.post('/use/:pnr', authenticate, authorize('TTE', 'ADMIN', 'USER'), markUsed);
export default router;
