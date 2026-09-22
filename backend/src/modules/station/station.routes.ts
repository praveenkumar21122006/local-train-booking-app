import { Router } from 'express';
import { listStations, getStation } from './station.controller';
const router = Router();
// Public - stations visible without login (UTS behavior)
router.get('/', listStations);
router.get('/:code', getStation);
export default router;
