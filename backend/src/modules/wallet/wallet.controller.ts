import { Request, Response } from 'express';
import prisma from '../../config/db';

export const getWallet = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
  res.json({ success: true, data: wallet });
};

export const recharge = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { amount } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0 || amt > 10000) return res.status(400).json({ success: false, message: 'Amount must be 1-10000' });

  // Mock payment gateway success - ACID transaction
  const isSqlite = (process.env.DATABASE_URL||'').startsWith('file:');
  const result = await prisma.$transaction(async (tx) => {
    let wallet:any;
    if(isSqlite){
      wallet = await tx.wallet.findUnique({ where: { userId }});
      if (!wallet) throw new Error('WALLET_NOT_FOUND');
    } else {
      const rows:any[] = await tx.$queryRaw`SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`;
      if (!rows[0]) throw new Error('WALLET_NOT_FOUND');
      wallet = rows[0];
    }
    const newBalance = Number(wallet.balance) + amt;
    await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
    const txn = await tx.walletTransaction.create({
      data: { walletId: userId, amount: amt, type: 'CREDIT', status: 'SUCCESS', balanceAfter: newBalance }
    });
    return { newBalance, txn };
  });

  res.json({ success: true, message: `Recharged ₹${amt}`, data: { balance: result.newBalance, transaction: result.txn } });
};

export const history = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
  const skip = (page - 1) * limit;
  const [txns, total] = await Promise.all([
    prisma.walletTransaction.findMany({ where: { walletId: userId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.walletTransaction.count({ where: { walletId: userId } })
  ]);
  res.json({ success: true, data: txns, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};
