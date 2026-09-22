import { Router } from 'express';
import { calculate } from './fare.controller';
const router = Router();
// Public - fare check without login
router.get('/calculate', calculate);
export default router;
