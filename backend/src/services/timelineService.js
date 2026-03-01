import Activity from '../models/Activity.js';
import mongoose from 'mongoose';

/**
 * Cursor-based pagination for lead timeline.
 * cursor = ISO timestamp of last item's createdAt.
 * Returns { activities, nextCursor } where nextCursor is null if no more.
 */
export async function getTimeline(leadId, cursor, limit = 10) {
  if (!mongoose.Types.ObjectId.isValid(leadId)) return { activities: [], nextCursor: null };
  const id = leadId;

  const query = { leadId: id };
  if (cursor) {
    let cursorDate;
    try {
      cursorDate = new Date(cursor);
      if (Number.isNaN(cursorDate.getTime())) cursorDate = null;
    } catch {
      cursorDate = null;
    }
    if (cursorDate) query.createdAt = { $lt: cursorDate };
  }

  const activities = await Activity.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = activities.length > limit;
  const page = hasMore ? activities.slice(0, limit) : activities;
  const nextCursor = hasMore && page.length
    ? page[page.length - 1].createdAt
    : null;

  return {
    activities: page,
    nextCursor: nextCursor ? nextCursor.toISOString() : null,
  };
}
