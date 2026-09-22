import { Request, Response } from 'express';
import prisma from '../../config/db';
import bcrypt from 'bcryptjs';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../config/jwt';
import redis from '../../config/redis';
import { v4 as uuidv4 } from 'uuid';

export const register = async (req: Request, res: Response) => {
  const { phone, email, fullName, password } = req.body;
  if (!phone || !fullName || !password) return res.status(400).json({ success: false, message: 'phone, fullName, password required' });
  if (!/^[6-9][0-9]{9}$/.test(phone)) return res.status(400).json({ success: false, message: 'Invalid phone' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 chars' });

  const existing = await prisma.user.findFirst({ where: { OR: [{ phone }, ...(email ? [{ email }] : [])] } });
  if (existing) return res.status(409).json({ success: false, message: 'User already exists' });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { phone, email, fullName, passwordHash: hash }
  });
  await prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

  const jti = uuidv4();
  const accessToken = signAccessToken({ id: user.id, phone: user.phone, role: user.role, jti });
  const refreshToken = signRefreshToken({ id: user.id, jti });

  await redis.setex(`session:${user.id}:${jti}`, 7 * 24 * 3600, refreshToken);

  res.status(201).json({ success: true, data: { id: user.id, phone, fullName, accessToken, refreshToken } });
};

export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false, message: 'phone and password required' });

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const jti = uuidv4();
  const accessToken = signAccessToken({ id: user.id, phone: user.phone, role: user.role, jti });
  const refreshToken = signRefreshToken({ id: user.id, jti });
  await redis.setex(`session:${user.id}:${jti}`, 7 * 24 * 3600, refreshToken);

  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

  res.json({ success: true, data: { id: user.id, phone: user.phone, fullName: user.fullName, role: user.role, walletBalance: wallet?.balance, accessToken, refreshToken } });
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken required' });
  try {
    const decoded: any = verifyRefreshToken(refreshToken);
    const stored = await redis.get(`session:${decoded.id}:${decoded.jti}`);
    if (stored !== refreshToken) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const newJti = uuidv4();
    const newAccess = signAccessToken({ id: user.id, phone: user.phone, role: user.role, jti: newJti });
    const newRefresh = signRefreshToken({ id: user.id, jti: newJti });

    await redis.del(`session:${decoded.id}:${decoded.jti}`);
    await redis.setex(`session:${user.id}:${newJti}`, 7 * 24 * 3600, newRefresh);

    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const me = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, phone: true, email: true, fullName: true, role: true, createdAt: true } });
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  res.json({ success: true, data: { ...user, walletBalance: wallet?.balance ?? 0 } });
};
