import app from './app';
import dotenv from 'dotenv';
import { startExpiryCron } from './jobs/expiry.cron';
dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚂 Local Train Ticketing API running on http://localhost:${PORT}`);
  console.log(`→ Health: http://localhost:${PORT}/health`);
  console.log(`→ API: http://localhost:${PORT}/api/v1`);
  startExpiryCron();
});
