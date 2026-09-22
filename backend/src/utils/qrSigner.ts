import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Use RS256 if keys provided, else HS256 fallback for dev
const QR_JWT_SECRET = process.env.QR_JWT_SECRET || 'qr-fallback-hs256-secret-dev-only';
const PRIVATE_KEY = process.env.QR_PRIVATE_KEY;
const PUBLIC_KEY = process.env.QR_PUBLIC_KEY;

const ALGO = PRIVATE_KEY && PUBLIC_KEY ? 'RS256' : 'HS256';

export const signTicketPayload = (payload: object): { token: string; signature: string } => {
  const key = ALGO === 'RS256' ? PRIVATE_KEY! : QR_JWT_SECRET;
  // @ts-ignore
  const token = jwt.sign(payload, key, { algorithm: ALGO, expiresIn: '2h' });
  const signature = token.split('.')[2];
  return { token, signature };
};

export const verifyTicketOffline = (token: string): { valid: boolean; reason?: string; ticket?: any } => {
  try {
    const key = ALGO === 'RS256' ? PUBLIC_KEY! : QR_JWT_SECRET;
    // @ts-ignore
    const decoded: any = jwt.verify(token, key, { algorithms: [ALGO] });
    if (decoded.expiresAt && new Date(decoded.expiresAt) < new Date()) {
      return { valid: false, reason: 'EXPIRED' };
    }
    return { valid: true, ticket: decoded };
  } catch (e: any) {
    if (e.name === 'TokenExpiredError') return { valid: false, reason: 'EXPIRED' };
    return { valid: false, reason: 'TAMPERED' };
  }
};
