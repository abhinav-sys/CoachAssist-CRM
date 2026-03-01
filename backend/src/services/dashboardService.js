import Lead from '../models/Lead.js';
import Activity from '../models/Activity.js';
import mongoose from 'mongoose';

const STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'LOST'];

/**
 * Build dashboard using a single aggregation with $facet (no JS loops).
 * Scoped by assignedTo when userId provided.
 */
export async function getDashboardData(userId = null) {
  const matchLead = userId ? { assignedTo: new mongoose.Types.ObjectId(userId) } : {};
  const leadMatchForOverdue = {
    ...matchLead,
    nextFollowUpAt: { $lt: new Date(), $ne: null },
    status: { $nin: ['CONVERTED', 'LOST'] },
  };

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const pipeline = [
    { $facet: {
      // Funnel counts by status (from Lead)
      funnel: [
        { $match: matchLead },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ],
      // Overdue follow-ups count
      overdue: [
        { $match: leadMatchForOverdue },
        { $count: 'count' },
      ],
      // Top sources (from Lead)
      sources: [
        { $match: { ...matchLead, source: { $exists: true, $ne: null } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { source: '$_id', count: 1, _id: 0 } },
      ],
    }},
  ];

  const [leadResult] = await Lead.aggregate(pipeline);

  const funnelCounts = {};
  STATUSES.forEach((s) => { funnelCounts[s] = 0; });
  (leadResult.funnel || []).forEach((f) => {
    funnelCounts[f.status] = f.count;
  });

  const totalLeads = Object.values(funnelCounts).reduce((a, b) => a + b, 0);
  const converted = funnelCounts.CONVERTED || 0;
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) / 100 : 0;

  const overdueCount = (leadResult.overdue && leadResult.overdue[0])
    ? leadResult.overdue[0].count
    : 0;

  const topSources = (leadResult.sources || []).map((s) => ({
    source: s.source,
    count: s.count,
  }));

  // Activity graph: last 7 days from Activity, scoped to user's leads
  const userLeadIds = Object.keys(matchLead).length
    ? await Lead.find(matchLead).distinct('_id')
    : await Lead.distinct('_id');
  const activityGraph = await Activity.aggregate([
    { $match: { leadId: { $in: userLeadIds }, createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', count: 1, _id: 0 } },
  ]);

  // Fill missing days with 0
  const dateToCount = {};
  activityGraph.forEach((g) => { dateToCount[g.date] = g.count; });
  const activityGraphFilled = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    activityGraphFilled.push({ date: dateStr, count: dateToCount[dateStr] || 0 });
  }

  return {
    funnelCounts,
    conversionRate,
    overdueFollowUps: overdueCount,
    topSources,
    activityGraph: activityGraphFilled,
  };
}
