import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './modules/auth/auth.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import stationRoutes from './modules/station/station.routes';
import fareRoutes from './modules/fare/fare.routes';
import bookingRoutes from './modules/booking/booking.routes';
import tteRoutes from './modules/tte/tte.routes';
import { errorHandler, notFound } from './middlewares/errorHandler';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);

// Health
app.get('/health', (req, res) => res.json({ success: true, message: 'Local Train Ticketing API running', timestamp: new Date().toISOString() }));
app.get('/', (req, res) => res.json({ success: true, message: 'Go to /health or /api/v1', docs: '/api/v1' }));

// API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/stations', stationRoutes);
app.use('/api/v1/fare', fareRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/tte', tteRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
