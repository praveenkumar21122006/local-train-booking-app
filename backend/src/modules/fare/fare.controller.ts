import { Request, Response } from 'express';
import { calculateFare, calculateSeasonFare } from '../../utils/fareCalculator';
import redis from '../../config/redis';

export const calculate = async (req: Request, res: Response) => {
  const { from, to, class: travelClass = 'SECOND', passType } = req.query as any;
  if (!from || !to) return res.status(400).json({ success: false, message: 'from and to required' });
  const cls = (travelClass as string).toUpperCase();
  if (!['SECOND', 'FIRST', 'AC'].includes(cls)) return res.status(400).json({ success: false, message: 'Invalid class' });

  const cacheKey = `fare:${from.toUpperCase()}:${to.toUpperCase()}:${cls}:${passType || 'SINGLE'}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, cached: true, data: JSON.parse(cached) });

  try {
    if (passType && ['MONTHLY', 'QUARTERLY'].includes((passType as string).toUpperCase())) {
      const fare = await calculateSeasonFare(from.toUpperCase(), to.toUpperCase(), cls, passType.toUpperCase() as any);
      const payload = { from: from.toUpperCase(), to: to.toUpperCase(), travelClass: cls, passType: passType.toUpperCase(), fare, type: 'SEASON' };
      await redis.setex(cacheKey, 86400, JSON.stringify(payload));
      return res.json({ success: true, data: payload });
    }
    const result = await calculateFare(from.toUpperCase(), to.toUpperCase(), cls);
    const payload = { from: from.toUpperCase(), to: to.toUpperCase(), travelClass: cls, ...result, fare: result.fare };
    await redis.setex(cacheKey, 86400, JSON.stringify(payload));
    res.json({ success: true, data: payload });
  } catch (e: any) {
    if (e.message === 'STATION_NOT_FOUND') return res.status(404).json({ success: false, message: 'Station not found' });
    if (e.message === 'FARE_SLAB_NOT_FOUND') return res.status(500).json({ success: false, message: 'Fare slab missing' });
    throw e;
  }
};
