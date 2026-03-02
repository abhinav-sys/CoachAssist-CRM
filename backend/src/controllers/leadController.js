import * as leadService from '../services/leadService.js';

export async function list(req, res, next) {
  try {
    const { status, tags, search, page } = req.query;
    const result = await leadService.listLeads({
      status,
      tags: tags || req.query.tags,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, email, phone, source, status, tags, assignedTo, nextFollowUpAt } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const lead = await leadService.createLead(
      { name, email, phone, source, status, tags, assignedTo, nextFollowUpAt },
      req.userId
    );
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const lead = await leadService.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const deleted = await leadService.deleteLead(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Lead not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
