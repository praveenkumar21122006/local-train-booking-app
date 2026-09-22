import { Request, Response } from 'express';
import prisma from '../../config/db';
import redis from '../../config/redis';
import { calculateFare, calculateSeasonFare } from '../../utils/fareCalculator';
import { signTicketPayload } from '../../utils/qrSigner';
import { v4 as uuidv4 } from 'uuid';

const generatePNR = () => `UTS${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

// --- JOURNEY TICKET (Paperless) - valid 1 hour ---
export const bookJourneyTicket = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { sourceCode, destCode, travelClass = 'SECOND', passengerCount = 1 } = req.body;
  if (!sourceCode || !destCode) return res.status(400).json({ success: false, message: 'sourceCode and destCode required' });
  if (sourceCode.toUpperCase() === destCode.toUpperCase()) return res.status(400).json({ success: false, message: 'Source and destination cannot be same' });
  const cls = travelClass.toUpperCase();
  if (!['SECOND', 'FIRST', 'AC'].includes(cls)) return res.status(400).json({ success: false, message: 'Invalid travelClass' });

  try {
    const cacheKey = `fare:${sourceCode.toUpperCase()}:${destCode.toUpperCase()}:${cls}`;
    let fareData: any = await redis.get(cacheKey);
    if (fareData) fareData = JSON.parse(fareData);
    else {
      fareData = await calculateFare(sourceCode.toUpperCase(), destCode.toUpperCase(), cls);
      await redis.setex(cacheKey, 86400, JSON.stringify(fareData));
    }
    const totalFare = fareData.fare * Math.max(1, Math.min(6, Number(passengerCount) || 1));
    const distance = fareData.distanceKm;

    const result = await prisma.$transaction(async (tx) => {
      const isSqlite = (process.env.DATABASE_URL||'').startsWith('file:');
      let wallet:any;
      if(isSqlite){ wallet = await tx.wallet.findUnique({ where: { userId }}); if(!wallet) throw new Error('WALLET_NOT_FOUND'); } else { const rows:any[] = await tx.$queryRaw`SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`; if(!rows[0]) throw new Error('WALLET_NOT_FOUND'); wallet = rows[0]; }
      if (Number(wallet.balance) < totalFare) throw new Error('INSUFFICIENT_BALANCE');
      const newBalance = Number(wallet.balance) - totalFare;
      const pnr = generatePNR();
      const ticketId = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hr

      const payload = { pnr, ticketId, userId, sourceCode: sourceCode.toUpperCase(), destCode: destCode.toUpperCase(), travelClass: cls, fare: totalFare, passengerCount, distanceKm: distance, expiresAt: expiresAt.toISOString(), type: 'JOURNEY' };
      const { token: qrPayload, signature } = signTicketPayload(payload);

      const ticket = await tx.ticket.create({
        data: {
          id: ticketId, pnr, userId, ticketType: 'JOURNEY', sourceStation: sourceCode.toUpperCase(), destStation: destCode.toUpperCase(),
          travelClass: cls as any, fare: totalFare, distanceKm: distance, status: 'ACTIVE', qrPayload, qrSignature: signature, expiresAt
        }
      });
      await tx.wallet.update({ where: { userId }, data: { balance: newBalance, version: { increment: 1 } } });
      await tx.walletTransaction.create({ data: { walletId: userId, amount: totalFare, type: 'DEBIT', status: 'SUCCESS', referenceId: ticketId, balanceAfter: newBalance } });
      return { ticket, newBalance, qrPayload };
    });

    res.status(201).json({ success: true, message: 'Journey ticket booked', data: { pnr: result.ticket.pnr, fare: totalFare, distanceKm: distance, expiresAt: result.ticket.expiresAt, qrCodeData: result.qrPayload, walletBalance: result.newBalance } });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') return res.status(402).json({ success: false, message: 'Insufficient R-Wallet balance' });
    if (err.message === 'WALLET_NOT_FOUND') return res.status(404).json({ success: false, message: 'Wallet not found' });
    if (err.message === 'STATION_NOT_FOUND') return res.status(404).json({ success: false, message: 'Station not found' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Booking failed', error: err.message });
  }
};

// --- PLATFORM TICKET - valid 2 hours, 1 platform only ---
export const bookPlatformTicket = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { stationCode, passengerCount = 1 } = req.body;
  if (!stationCode) return res.status(400).json({ success: false, message: 'stationCode required' });
  const PLATFORM_FARE = 10; // flat
  const totalFare = PLATFORM_FARE * Math.max(1, Math.min(6, Number(passengerCount) || 1));

  try {
    const station = await prisma.station.findUnique({ where: { code: stationCode.toUpperCase() } });
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });

    const result = await prisma.$transaction(async (tx) => {
      const isSqlite = (process.env.DATABASE_URL||'').startsWith('file:');
      let wallet:any;
      if(isSqlite){ wallet = await tx.wallet.findUnique({ where: { userId }}); if(!wallet) throw new Error('WALLET_NOT_FOUND'); } else { const rows:any[] = await tx.$queryRaw`SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`; if(!rows[0]) throw new Error('WALLET_NOT_FOUND'); wallet = rows[0]; }
      if (Number(wallet.balance) < totalFare) throw new Error('INSUFFICIENT_BALANCE');
      const newBalance = Number(wallet.balance) - totalFare;
      const pnr = generatePNR();
      const ticketId = uuidv4();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hrs
      const payload = { pnr, ticketId, userId, stationCode: stationCode.toUpperCase(), fare: totalFare, passengerCount, expiresAt: expiresAt.toISOString(), type: 'PLATFORM' };
      const { token: qrPayload, signature } = signTicketPayload(payload);
      const ticket = await tx.ticket.create({
        data: { id: ticketId, pnr, userId, ticketType: 'PLATFORM', sourceStation: stationCode.toUpperCase(), destStation: null, travelClass: null, fare: totalFare, status: 'ACTIVE', qrPayload, qrSignature: signature, expiresAt }
      });
      await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
      await tx.walletTransaction.create({ data: { walletId: userId, amount: totalFare, type: 'DEBIT', status: 'SUCCESS', referenceId: ticketId, balanceAfter: newBalance } });
      return { ticket, newBalance, qrPayload };
    });

    res.status(201).json({ success: true, message: 'Platform ticket booked', data: { pnr: result.ticket.pnr, fare: totalFare, expiresAt: result.ticket.expiresAt, qrCodeData: result.qrPayload, walletBalance: result.newBalance } });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') return res.status(402).json({ success: false, message: 'Insufficient balance' });
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
};

// --- SEASON PASS - MONTHLY(30d) / QUARTERLY(90d) ---
export const bookSeasonTicket = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { sourceCode, destCode, travelClass = 'SECOND', passType = 'MONTHLY' } = req.body;
  if (!sourceCode || !destCode) return res.status(400).json({ success: false, message: 'sourceCode and destCode required' });
  const cls = travelClass.toUpperCase();
  const pType = passType.toUpperCase();
  if (!['MONTHLY', 'QUARTERLY'].includes(pType)) return res.status(400).json({ success: false, message: 'passType must be MONTHLY or QUARTERLY' });

  try {
    const fare = await calculateSeasonFare(sourceCode.toUpperCase(), destCode.toUpperCase(), cls, pType as any);
    const days = pType === 'MONTHLY' ? 30 : 90;
    const result = await prisma.$transaction(async (tx) => {
      const isSqlite = (process.env.DATABASE_URL||'').startsWith('file:');
      let wallet:any;
      if(isSqlite){ wallet = await tx.wallet.findUnique({ where: { userId }}); if(!wallet) throw new Error('WALLET_NOT_FOUND'); } else { const rows:any[] = await tx.$queryRaw`SELECT * FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`; if(!rows[0]) throw new Error('WALLET_NOT_FOUND'); wallet = rows[0]; }
      if (Number(wallet.balance) < fare) throw new Error('INSUFFICIENT_BALANCE');
      const newBalance = Number(wallet.balance) - fare;
      const pnr = generatePNR();
      const ticketId = uuidv4();
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const payload = { pnr, ticketId, userId, sourceCode: sourceCode.toUpperCase(), destCode: destCode.toUpperCase(), travelClass: cls, fare, passType: pType, validTill: expiresAt.toISOString(), type: 'SEASON' };
      const { token: qrPayload, signature } = signTicketPayload(payload);
      const ticket = await tx.ticket.create({
        data: { id: ticketId, pnr, userId, ticketType: 'SEASON', sourceStation: sourceCode.toUpperCase(), destStation: destCode.toUpperCase(), travelClass: cls as any, fare, status: 'ACTIVE', qrPayload, qrSignature: signature, expiresAt, validFrom: new Date() }
      });
      await tx.seasonPass.create({ data: { ticketId, passType: pType, validTill: expiresAt } });
      await tx.wallet.update({ where: { userId }, data: { balance: newBalance } });
      await tx.walletTransaction.create({ data: { walletId: userId, amount: fare, type: 'DEBIT', status: 'SUCCESS', referenceId: ticketId, balanceAfter: newBalance } });
      return { ticket, newBalance, qrPayload };
    });

    res.status(201).json({ success: true, message: `${pType} season pass booked`, data: { pnr: result.ticket.pnr, fare, expiresAt: result.ticket.expiresAt, qrCodeData: result.qrPayload, walletBalance: result.newBalance } });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_BALANCE') return res.status(402).json({ success: false, message: 'Insufficient balance' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
};

export const myTickets = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const status = req.query.status as string;
  const where: any = { userId };
  if (status && ['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'].includes(status.toUpperCase())) where.status = status.toUpperCase();
  // Auto-flag expired before return
  await prisma.ticket.updateMany({ where: { userId, status: 'ACTIVE', expiresAt: { lt: new Date() } }, data: { status: 'EXPIRED' } });
  const tickets = await prisma.ticket.findMany({ where, orderBy: { bookedAt: 'desc' }, include: { seasonPass: true } });
  res.json({ success: true, data: tickets });
};

export const getTicket = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const ticket = await prisma.ticket.findFirst({ where: { pnr: req.params.pnr.toUpperCase(), userId }, include: { seasonPass: true, source: true, dest: true } });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  // Check expiry live
  if (ticket.status === 'ACTIVE' && new Date(ticket.expiresAt) < new Date()) {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'EXPIRED' } });
    ticket.status = 'EXPIRED' as any;
  }
  res.json({ success: true, data: ticket });
};
