# Local Train Ticketing System (UTS Inspired)

Full-stack **paperless** ticketing: Journey + Platform + Season Pass, R-Wallet with ACID, dynamic fare engine, offline-verifiable QR (JWT RS256/HS256), Redis caching, auto-expiry.

## Tech Stack
- **Backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL + Redis (ioredis) + JWT
- **Frontend**: Mobile-first Tailwind CSS + Vanilla JS + QRCode.js
- **Infra**: Docker Compose (postgres:15, redis:7, api)

## System Architecture
See `ARCHITECTURE.md` (Mermaid) - API Gateway → Auth/Wallet/Fare/Booking/QR services → PG (ACID `SERIALIZABLE` + `FOR UPDATE`) + Redis cache + Cron expiry.

## Quick Start

### 1. With Docker (recommended)
```bash
cp backend/.env.example backend/.env
# Edit DATABASE_URL / REDIS_URL if needed; generate QR keys or use fallback
docker-compose up --build
# In another terminal
cd backend
npx prisma migrate dev --name init
npx prisma db seed   # seeds stations, lines, fare slabs
```
- API: http://localhost:4000/health , http://localhost:4000/api/v1
- Frontend: open `frontend/index.html` via VS Code Live Server or `npx serve frontend`

### 2. Local Dev (without Docker)
```bash
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL to your local Postgres, or use SQLite for quick demo:
# DATABASE_URL="file:./dev.db" and change prisma schema provider to sqlite (for demo only)
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev  # ts-node-dev on :4000

# Frontend
# Option A: just open frontend/index.html
# Option B: npx serve frontend --listen 3000
```

### 3. PostgreSQL DDL
Prisma schema is source of truth (`prisma/schema.prisma`). Raw SQL DDL is in `backend/prisma/schema.prisma` + `database.sql` (generated via `prisma migrate`). Also see `ARCHITECTURE.md` for SQL DDL script.

## Core API Endpoints
Base: `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | {phone, fullName, password, email?} |
| POST | /auth/login | {phone, password} -> JWT |
| POST | /auth/refresh | {refreshToken} |
| GET | /auth/me | Profile + wallet |
| GET | /wallet | Balance |
| POST | /wallet/recharge | {amount} |
| GET | /wallet/transactions | ?page&limit |
| GET | /stations | ?q=&zone= |
| GET | /stations/:code | Detail |
| GET | /fare/calculate | ?from=CSMT&to=TNA&class=SECOND&passType=MONTHLY |
| POST | /bookings/journey | {sourceCode, destCode, travelClass, passengerCount} |
| POST | /bookings/platform | {stationCode} |
| POST | /bookings/season | {sourceCode, destCode, travelClass, passType} |
| GET | /bookings/my-tickets | ?status=ACTIVE |
| GET | /bookings/:pnr | Detail + QR |
| POST | /tte/verify | {qrPayload} offline+online |
| POST | /tte/use/:pnr | Mark USED (platform single-use) |

### Example: Book Journey
```bash
curl -X POST http://localhost:4000/api/v1/bookings/journey \
 -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" \
 -d '{"sourceCode":"CSMT","destCode":"TNA","travelClass":"SECOND","passengerCount":1}'
```

## Security & Constraints
- **Wallet ACID**: `prisma.$transaction` with `isolationLevel: Serializable` + `SELECT ... FOR UPDATE` prevents double-spending under concurrency.
- **QR Tamper-proof**: JWT signed with RS256 (or HS256 fallback). TTE verifies offline with public key; payload includes pnr, stations, expiry. `verifyTicketOffline()` needs no DB.
- **Expiry**: `pg_cron` + `setInterval` job marks `ACTIVE` → `EXPIRED` when `expires_at < NOW()` (Journey 1h, Platform 2h, Season 30/90d). Frontend also checks live.
- **Rate Limit**: 200 req / 15m per IP.
- **Helmet + CORS + Zod validation** (extend).

## Frontend Features
- Auth overlay (login/register) -> stores JWT
- Book tab: Journey/Platform/Season with station selectors, fare preview, one-tap booking
- Tickets tab: Filter ACTIVE/ALL/EXPIRED, View QR modal
- Wallet tab: Balance, recharge shortcuts, txn history
- TTE tab: Paste QR JWT or PNR -> Verify (offline sig + DB status) + Mark USED

## Demo Credentials
Register any 10-digit phone + password ≥6. Or seed a demo user:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register -H "Content-Type: application/json" -d '{"phone":"9876543210","fullName":"Demo User","password":"demo123"}'
```

## Next Steps
- Add GPS fence (5m radius) check before booking
- Integrate real payment gateway (Razorpay) + Webhooks
- Add Prisma `pg_cron` extension for DB-level expiry
- PWA + Service Worker for offline ticket view
