import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const signAccessToken = (payload: object) => jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
export const signRefreshToken = (payload: object) => jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any);
export const verifyAccessToken = (token: string) => jwt.verify(token, JWT_SECRET);
export const verifyRefreshToken = (token: string) => jwt.verify(token, JWT_REFRESH_SECRET);
