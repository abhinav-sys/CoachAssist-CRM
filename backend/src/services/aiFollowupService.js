import { GoogleGenerativeAI } from '@google/generative-ai';
import Lead from '../models/Lead.js';
import Activity from '../models/Activity.js';
import { logActivity } from './leadService.js';
import mongoose from 'mongoose';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * Fetch lead and last 3 activities for context.
 */
async function getLeadWithRecentActivities(leadId) {
  const lead = await Lead.findById(leadId).lean();
  if (!lead) return null;
  const activities = await Activity.find({ leadId })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();
  return { lead, activities };
}

/**
 * Build prompt and call Gemini; return parsed JSON.
 */
async function generateFollowUpWithGemini(lead, activities) {
  if (!genAI) {
    const err = new Error('Gemini API key not configured');
    err.status = 503;
    throw err;
  }

  const status = lead.status || 'NEW';
  const needsObjection = status === 'INTERESTED';

  const prompt = `You are a wellness coach assistant. Given the lead and their recent activity, generate a follow-up plan as JSON only, no markdown or extra text.

Lead: ${JSON.stringify(lead)}
Last activities: ${JSON.stringify(activities)}

Return exactly this JSON structure (no other text):
{
  "whatsappMessage": "A short, friendly WhatsApp message (2-3 sentences) to send to the lead",
  "callScript": ["bullet point 1 for the coach to say", "bullet point 2", "bullet point 3"],
  "objectionHandling": "${needsObjection ? 'Brief advice on handling common objections for an interested lead' : 'N/A - not needed for this status'}"
}

Reply with only the JSON object.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response?.text?.()?.trim() || '';
  if (!text) {
    const err = new Error('Empty response from AI');
    err.status = 502;
    throw err;
  }

  // Strip markdown code block if present
  let jsonStr = text;
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1].trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    const err = new Error('Invalid JSON from AI');
    err.status = 502;
    throw err;
  }
}

/**
 * Generate AI follow-up: fetch lead + activities, call Gemini, save to lead + log activity, return JSON.
 */
export async function generateAiFollowup(leadId, userId) {
  const data = await getLeadWithRecentActivities(leadId);
  if (!data) return null;

  const output = await generateFollowUpWithGemini(data.lead, data.activities);

  const lead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: { aiFollowup: output } },
    { new: true }
  );
  if (!lead) return null;

  await logActivity(leadId, 'AI_MESSAGE_GENERATED', output);

  return output;
}
