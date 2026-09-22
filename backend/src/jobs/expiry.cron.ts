import prisma from '../config/db';

export const expireTicketsJob = async () => {
  try {
    const result = await prisma.ticket.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' }
    });
    if (result.count > 0) console.log(`[Cron] Expired ${result.count} tickets`);
  } catch (e) {
    console.error('[Cron] Failed to expire tickets', e);
  }
};

export const startExpiryCron = () => {
  // Run every 2 minutes
  setInterval(expireTicketsJob, 2 * 60 * 1000);
  console.log('[Cron] Expiry job scheduled every 2 minutes');
};
