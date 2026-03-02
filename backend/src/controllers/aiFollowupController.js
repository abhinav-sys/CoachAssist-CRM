import * as aiFollowupService from '../services/aiFollowupService.js';
import * as leadService from '../services/leadService.js';
import { checkRateLimit } from '../utils/redis.js';

const RATE_LIMIT_KEY_PREFIX = 'ai_rate:';
const WINDOW_SECONDS = 3600;
const MAX_PER_HOUR_RAW = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR, 10);
// When AI_RATE_LIMIT_PER_HOUR <= 0, rate limiting is disabled.
const MAX_PER_HOUR = Number.isNaN(MAX_PER_HOUR_RAW) ? 15 : MAX_PER_HOUR_RAW;

export async function generate(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // If MAX_PER_HOUR <= 0, skip rate limiting entirely.
    if (MAX_PER_HOUR > 0) {
      const rateKey = `${RATE_LIMIT_KEY_PREFIX}${req.userId}`;
      const rate = await checkRateLimit(rateKey, MAX_PER_HOUR, WINDOW_SECONDS);
      if (!rate.allowed) {
        // When over our own limit, fall back to a hardcoded follow-up instead of erroring.
        const fallback = await aiFollowupService.generateFallbackAiFollowup(req.params.id, req.userId);
        return res.json({ ...(fallback || {}), fallback: true, retryAfter: rate.retryAfter });
      }
    }

    const output = await aiFollowupService.generateAiFollowup(req.params.id, req.userId);
    res.json(output);
  } catch (err) {
    next(err);
  }
}
