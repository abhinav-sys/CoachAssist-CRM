import * as aiFollowupService from '../services/aiFollowupService.js';
import * as leadService from '../services/leadService.js';
import { checkRateLimit } from '../utils/redis.js';

const RATE_LIMIT_KEY_PREFIX = 'ai_rate:';
const MAX_PER_HOUR = 5;
const WINDOW_SECONDS = 3600;

export async function generate(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const rateKey = `${RATE_LIMIT_KEY_PREFIX}${req.userId}`;
    const rate = await checkRateLimit(rateKey, MAX_PER_HOUR, WINDOW_SECONDS);
    if (!rate.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rate.retryAfter,
      });
    }

    const output = await aiFollowupService.generateAiFollowup(req.params.id, req.userId);
    res.json(output);
  } catch (err) {
    next(err);
  }
}
