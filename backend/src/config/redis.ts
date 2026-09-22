import dotenv from 'dotenv';
dotenv.config();

// Pure in-memory fallback for dev without docker/redis
class MemoryRedis {
  store = new Map<string, { v: string; exp?: number }>();
  async get(k: string) {
    const e = this.store.get(k);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) { this.store.delete(k); return null; }
    return e.v;
  }
  async setex(k: string, ttl: number, v: string) {
    this.store.set(k, { v, exp: Date.now() + ttl * 1000 });
  }
  async del(k: string) { this.store.delete(k); return 1; }
  async set(k: string, v: string) { this.store.set(k, { v }); return 'OK'; }
  async ping(){ return 'PONG'; }
  on() {}
}

// Try to use real Redis if available, otherwise fallback to memory
let redis: any = new MemoryRedis() as any;

try {
  // Only attempt real Redis if REDIS_URL is set and not memory
  const redisUrl = process.env.REDIS_URL || '';
  if (redisUrl && !redisUrl.includes('memory')) {
    // Dynamically import ioredis to avoid hard failure if not needed
    const Redis = require('ioredis');
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy: () => null, // don't retry
      connectTimeout: 1000,
    });
    client.on('error', () => {}); // suppress

    // Wrap methods to fallback to memory on failure
    const mem = redis as MemoryRedis;
    const wrap = (method: string) => async (...args: any[]) => {
      try {
        // Try real redis with short timeout
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('redis timeout')), 800));
        const result = await Promise.race([ (client as any)[method](...args), timeout ]);
        return result;
      } catch {
        // fallback to memory
        return (mem as any)[method](...args);
      }
    };

    redis = {
      get: wrap('get'),
      setex: wrap('setex'),
      set: wrap('set'),
      del: wrap('del'),
      ping: async () => { try { return await client.ping(); } catch { return mem.ping(); } },
      on: () => {},
      _client: client,
      _mem: mem,
    };

    // Try to connect silently
    client.connect().catch(() => {});
    client.ping().then(() => console.log('[Redis] Connected')).catch(() => console.log('[Redis] Using in-memory fallback'));
  } else {
    console.log('[Redis] Using in-memory store (dev mode)');
  }
} catch (e) {
  console.log('[Redis] Using in-memory fallback (error)', (e as any).message);
}

export default redis;
