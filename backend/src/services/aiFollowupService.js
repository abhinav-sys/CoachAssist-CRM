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
 * Build a simple, hardcoded follow-up when AI is unavailable or rate limited.
 */
function buildFallbackFollowup(lead) {
  const name = (lead?.name || '').split(' ')[0] || 'there';
  const status = lead?.status || 'NEW';
  const source = lead?.source || 'your enquiry';

  const whatsappMessage =
    `Hi ${name}, this is your wellness coach checking in about ${source}. ` +
    `I wanted to follow up and see how you’re feeling and whether now is a good time ` +
    `to take the next step with your coaching plan.`;

  const emailSubject = `Quick check-in about your coaching (${source})`;

  const emailBody =
    `Hi ${name},\n\n` +
    `I hope you’ve been doing well. I’m just checking in about ${source} ` +
    `and to see how you’re feeling about moving forward with your wellness goals.\n\n` +
    `If you’d like, we can book a short call to talk through where you are now and what the next best step could be for you.\n\n` +
    `Reply to this email and let me know what works best for you.\n\n` +
    `Best,\nYour coach`;

  const callScript = [
    `Ask how ${name} has been feeling lately and listen carefully.`,
    'Remind them of the goals they mentioned when they first enquired.',
    'Offer a specific next step (e.g. a short call or first session) and propose a time.',
  ];

  const objectionHandling =
    status === 'INTERESTED'
      ? 'If they hesitate, remind them that small, consistent changes matter more than perfection. ' +
        'Reassure them that the first step is light and focused on understanding their needs, not pushing a hard commitment.'
      : 'If they are not ready, thank them for their time, leave the door open, and ask if you can check in again in a couple of weeks.';

  return { whatsappMessage, emailSubject, emailBody, callScript, objectionHandling };
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
  "whatsappMessage": "A short, friendly message (2-3 sentences) suitable for WhatsApp or SMS, in plain text, no emojis",
  "emailSubject": "A concise email subject line for a follow-up",
  "emailBody": "A 2-4 paragraph email body in plain text. Use line breaks (\\n) for new paragraphs.",
  "callScript": ["bullet point 1 for the coach to say", "bullet point 2", "bullet point 3"],
  "objectionHandling": "${needsObjection ? 'Brief advice on handling common objections for an interested lead' : 'N/A - not needed for this status'}"
}

Reply with only the JSON object.`;

  // gemini-1.5-flash returns 404 for many new API keys; use 2.0 or set GEMINI_MODEL in env
  const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({ model: modelId });
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

  let output;
  try {
    output = await generateFollowUpWithGemini(data.lead, data.activities);
  } catch (err) {
    console.error('AI follow-up failed, using fallback:', err);
    output = buildFallbackFollowup(data.lead);
  }

  const lead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: { aiFollowup: output } },
    { new: true }
  );
  if (!lead) return null;

  await logActivity(leadId, 'AI_MESSAGE_GENERATED', output);

  return output;
}

/**
 * Generate follow-up using only the hardcoded fallback, without calling Gemini.
 * Used when our own rate limiter blocks an AI call.
 */
export async function generateFallbackAiFollowup(leadId, userId) {
  if (!mongoose.Types.ObjectId.isValid(leadId)) return null;
  const lead = await Lead.findById(leadId).lean();
  if (!lead) return null;

  const output = buildFallbackFollowup(lead);

  const updated = await Lead.findByIdAndUpdate(
    leadId,
    { $set: { aiFollowup: output } },
    { new: true }
  );
  if (!updated) return null;

  await logActivity(leadId, 'AI_MESSAGE_GENERATED', output);

  return output;
}
