import Lead from '../models/Lead.js';
import Activity from '../models/Activity.js';

/**
 * Log an activity for a lead. Used on create (STATUS_CHANGE null → NEW) and on status update.
 */
export async function logActivity(leadId, type, meta = {}) {
  await Activity.create({ leadId, type, meta });
}

/**
 * List leads with filters: status, tags, search (name/phone), pagination.
 */
export async function listLeads({ status, tags, search, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (tags && tags.length) {
    const tagList = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length) filter.tags = { $in: tagList };
  }
  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Lead.countDocuments(filter),
  ]);

  return { leads, total, page: Math.max(1, page), limit };
}

/**
 * Create a lead and auto-log STATUS_CHANGE (null → NEW).
 */
export async function createLead(data, userId) {
  const lead = await Lead.create({
    ...data,
    status: data.status || 'NEW',
    assignedTo: data.assignedTo || userId,
  });
  await logActivity(lead._id, 'STATUS_CHANGE', { previousStatus: null, newStatus: lead.status });
  return lead;
}

/**
 * Get a single lead by id.
 */
export async function getLeadById(id) {
  const lead = await Lead.findById(id).populate('assignedTo', 'name email').lean();
  return lead || null;
}

/**
 * Update lead. If status changes, auto-log STATUS_CHANGE with previousStatus and newStatus in meta.
 */
export async function updateLead(id, data) {
  const lead = await Lead.findById(id);
  if (!lead) return null;

  const previousStatus = lead.status;
  Object.assign(lead, data);
  await lead.save();

  if (data.status !== undefined && data.status !== previousStatus) {
    await logActivity(lead._id, 'STATUS_CHANGE', {
      previousStatus,
      newStatus: lead.status,
    });
  }
  return lead;
}

/**
 * Delete lead (hard delete).
 */
export async function deleteLead(id) {
  const lead = await Lead.findById(id);
  if (!lead) return null;
  await Lead.findByIdAndDelete(id);
  return true;
}
