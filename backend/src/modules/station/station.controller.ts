import { Request, Response } from 'express';
import prisma from '../../config/db';
import redis from '../../config/redis';

export const listStations = async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.toLowerCase();
  const zone = req.query.zone as string;

  const cacheKey = `stations:list:${q || ''}:${zone || ''}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, cached: true, data: JSON.parse(cached) });

  const where: any = {};
  if (zone) where.zone = zone.toUpperCase();
  if (q) where.OR = [{ code: { contains: q.toUpperCase() } }, { name: { contains: q, mode: 'insensitive' } }];

  const stations = await prisma.station.findMany({ where, orderBy: { name: 'asc' }, take: 100 });
  await redis.setex(cacheKey, 3600, JSON.stringify(stations));
  res.json({ success: true, data: stations });
};

export const getStation = async (req: Request, res: Response) => {
  const station = await prisma.station.findUnique({ where: { code: req.params.code.toUpperCase() }, include: { lineStations: { include: { line: true } } } });
  if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
  res.json({ success: true, data: station });
};
