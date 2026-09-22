import { Request, Response } from 'express';
import prisma from '../../config/db';
import { verifyTicketOffline } from '../../utils/qrSigner';

export const verifyTicket = async (req: Request, res: Response) => {
  const { qrPayload } = req.body;
  if (!qrPayload) return res.status(400).json({ success: false, message: 'qrPayload required' });

  // 1. Offline cryptographic verification (no DB)
  const offline = verifyTicketOffline(qrPayload);
  if (!offline.valid) {
    return res.json({ success: true, valid: false, reason: offline.reason, offlineVerified: false });
  }

  // 2. Online DB validation (status + expiry + used)
  const pnr = offline.ticket.pnr;
  const ticket = await prisma.ticket.findUnique({ where: { pnr }, include: { source: true, dest: true } });

  if (!ticket) return res.json({ success: true, valid: false, reason: 'NOT_FOUND', offlineVerified: true });
  if (ticket.status === 'EXPIRED') return res.json({ success: true, valid: false, reason: 'EXPIRED', ticket, offlineVerified: true });
  if (ticket.status === 'CANCELLED') return res.json({ success: true, valid: false, reason: 'CANCELLED', ticket, offlineVerified: true });
  if (ticket.status === 'USED') return res.json({ success: true, valid: false, reason: 'ALREADY_USED', ticket, offlineVerified: true });
  if (new Date(ticket.expiresAt) < new Date()) {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'EXPIRED' } });
    return res.json({ success: true, valid: false, reason: 'EXPIRED', ticket: { ...ticket, status: 'EXPIRED' }, offlineVerified: true });
  }

  res.json({ success: true, valid: true, reason: 'VALID', ticket, offlineVerified: true, decoded: offline.ticket });
};

export const markUsed = async (req: Request, res: Response) => {
  const { pnr } = req.params;
  const ticket = await prisma.ticket.findUnique({ where: { pnr: pnr.toUpperCase() } });
  if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
  if (ticket.status !== 'ACTIVE') return res.status(400).json({ success: false, message: `Ticket already ${ticket.status}` });
  // Platform tickets are single-use; journey tickets could remain ACTIVE until expiry - but TTE can mark USED
  const updated = await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'USED', usedAt: new Date() } });
  res.json({ success: true, message: 'Ticket marked as USED', data: updated });
};
