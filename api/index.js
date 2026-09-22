// Vercel Serverless Entry for Local Train Ticketing API
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let app;
let initialized = false;

async function initializeDB() {
  if (initialized) return;
  initialized = true;

  // Vercel writable path
  if (process.env.VERCEL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:/tmp/dev.db';
    const tmpDb = '/tmp/dev.db';
    const commitDb = path.join(__dirname, '..', 'backend', 'prisma', 'dev.db');
    
    try {
      // If /tmp DB doesn't exist, copy committed DB or create via prisma
      if (!fs.existsSync(tmpDb)) {
        if (fs.existsSync(commitDb)) {
          console.log('[Vercel] Copying committed DB to /tmp...');
          fs.copyFileSync(commitDb, tmpDb);
          console.log('[Vercel] DB copied, size:', fs.statSync(tmpDb).size);
        } else {
          console.log('[Vercel] No committed DB, will create via prisma push');
          // Try to run prisma db push at runtime if prisma available
          try {
            execSync('npx prisma db push --accept-data-loss --skip-generate', {
              cwd: path.join(__dirname, '..', 'backend'),
              env: { ...process.env, DATABASE_URL: 'file:/tmp/dev.db' },
              stdio: 'inherit',
              timeout: 15000
            });
            console.log('[Vercel] prisma db push done');
          } catch (e) {
            console.warn('[Vercel] prisma db push failed:', e.message);
          }
        }
      } else {
        console.log('[Vercel] /tmp DB already exists');
      }

      // Ensure tables exist and seed if empty
      const { PrismaClient } = require('../backend/node_modules/@prisma/client');
      const prisma = new PrismaClient();
      try {
        const count = await prisma.station.count();
        console.log('[Vercel] Stations count:', count);
        if (count === 0) {
          console.log('[Vercel] DB empty, seeding...');
          // Quick seed via SQL if needed - use the seed.ts logic via require
          // Fallback: run seed via node
          try {
            execSync('node -r ts-node/register prisma/seed.ts', {
              cwd: path.join(__dirname, '..', 'backend'),
              env: { ...process.env, DATABASE_URL: 'file:/tmp/dev.db' },
              stdio: 'inherit',
              timeout: 20000
            });
          } catch (e) {
            console.warn('[Vercel] seed failed:', e.message);
          }
        }
      } catch (e) {
        console.warn('[Vercel] DB check failed:', e.message);
        // If table doesn't exist, try db push
        try {
          execSync('npx prisma db push --accept-data-loss --skip-generate', {
            cwd: path.join(__dirname, '..', 'backend'),
            env: { ...process.env, DATABASE_URL: 'file:/tmp/dev.db' },
            stdio: 'inherit',
            timeout: 15000
          });
        } catch (err) {
          console.warn('[Vercel] db push retry failed:', err.message);
        }
      } finally {
        await prisma.$disconnect().catch(()=>{});
      }
    } catch (e) {
      console.warn('[Vercel] Init error:', e.message);
    }
  }
}

async function getApp() {
  if (app) return app;
  await initializeDB();
  // Import after DB init so DATABASE_URL is set
  const appModule = require('../backend/dist/app.js');
  app = appModule.default || appModule;
  return app;
}

module.exports = async (req, res) => {
  const expressApp = await getApp();
  return expressApp(req, res);
};
