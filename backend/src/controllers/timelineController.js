import * as timelineService from '../services/timelineService.js';
import * as leadService from '../services/leadService.js';

export async function get(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const { cursor, limit } = req.query;
    const result = await timelineService.getTimeline(
      req.params.id,
      cursor || undefined,
      limit ? parseInt(limit, 10) : 10
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
