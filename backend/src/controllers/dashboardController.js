import * as dashboardService from '../services/dashboardService.js';
import { getCached, setCache } from '../utils/redis.js';

const CACHE_TTL = 120; // seconds

export async function get(req, res, next) {
  try {
    const userId = req.userId;
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `dashboard:${userId}:${today}`;

    const cached = await getCached(cacheKey);
    if (cached) return res.json(cached);

    const data = await dashboardService.getDashboardData(userId);
    await setCache(cacheKey, data, CACHE_TTL);

    res.json(data);
  } catch (err) {
    next(err);
  }
}
