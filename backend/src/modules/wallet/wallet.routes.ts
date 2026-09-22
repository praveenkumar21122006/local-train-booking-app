import { Router } from 'express';
import { getWallet, recharge, history } from './wallet.controller';
import { authenticate } from '../../middlewares/auth.middleware';
const router = Router();
router.use(authenticate);
router.get('/', getWallet);
router.post('/recharge', recharge);
router.get('/transactions', history);
export default router;
