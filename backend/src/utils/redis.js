import Redis from 'ioredis';

let redis = null;

export function getRedis() {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL not set — Redis caching and rate limiting disabled');
    return null;
  }
  redis = new Redis(url);
  redis.on('error', (err) => console.error('Redis error:', err));
  return redis;
}

export async function getCached(key) {
  const client = getRedis();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCache(key, value, ttlSeconds = 120) {
  const client = getRedis();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.error('Redis setCache error:', err);
  }
}

/**
 * Rate limit: INCR key, EXPIRE only on first call. Returns { allowed, count, ttl }.
 * If over limit, returns { allowed: false, retryAfter: seconds }.
 */
export async function checkRateLimit(key, maxCount = 5, windowSeconds = 3600) {
  const client = getRedis();
  if (!client) return { allowed: true };
  try {
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSeconds);
    const ttl = await client.ttl(key);
    if (count > maxCount) {
      return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSeconds };
    }
    return { allowed: true, count, ttl };
  } catch {
    return { allowed: true };
  }
}
