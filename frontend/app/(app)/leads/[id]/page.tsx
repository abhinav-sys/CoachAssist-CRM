'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type Lead = {
  _id: string;
  name: string;
  phone?: string;
  source?: string;
  status: string;
  tags?: string[];
  nextFollowUpAt?: string;
  assignedTo?: { name: string; email: string };
  aiFollowup?: { whatsappMessage?: string; callScript?: string[]; objectionHandling?: string };
};

type Activity = {
  _id: string;
  type: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

const STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'LOST'];
const SOURCES = ['Instagram', 'Referral', 'Ads'];

const ACTIVITY_LABELS: Record<string, string> = {
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  NOTE: 'Note',
  STATUS_CHANGE: 'Status change',
  AI_MESSAGE_GENERATED: 'AI follow-up',
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<Lead['aiFollowup'] | null>(null);
  const [edit, setEdit] = useState<Partial<Lead>>({});

  const fetchLead = useCallback(async () => {
    const { data, error } = await api<Lead>(`/leads/${id}`);
    if (error) {
      toast.error(error);
      if (error.includes('not found')) router.push('/leads');
      return;
    }
    if (data) {
      setLead(data);
      setEdit(data);
      setAiResult(data.aiFollowup || null);
    }
  }, [id, router]);

  const fetchTimeline = useCallback(async (cursor?: string) => {
    if (cursor) setTimelineLoading(true);
    const url = cursor ? `/leads/${id}/timeline?cursor=${encodeURIComponent(cursor)}&limit=10` : `/leads/${id}/timeline?limit=10`;
    const { data, error } = await api<{ activities: Activity[]; nextCursor: string | null }>(url);
    if (cursor) setTimelineLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      if (cursor) setActivities((prev) => [...prev, ...data.activities]);
      else setActivities(data.activities);
      setNextCursor(data.nextCursor);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLead();
      await fetchTimeline();
      setLoading(false);
    })();
  }, [fetchLead, fetchTimeline]);

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    const { error } = await api<Lead>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(edit),
    });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Saved');
    fetchLead();
    fetchTimeline(); // refresh timeline in case status changed
  }

  async function handleGenerateFollowup() {
    setAiLoading(true);
    setAiResult(null);
    const { data, error, status } = await api<{ whatsappMessage?: string; callScript?: string[]; objectionHandling?: string }>(
      `/leads/${id}/ai-followup`,
      { method: 'POST' }
    );
    setAiLoading(false);
    if (status === 429) {
      const retryAfter = (data as { retryAfter?: number })?.retryAfter ?? 60;
      toast.error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setAiResult(data);
      toast.success('Follow-up generated');
      fetchLead();
      fetchTimeline();
    }
  }

  if (loading && !lead) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-48 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12 text-slate-600">
        Lead not found. <Link href="/leads" className="text-emerald-600 hover:underline">Back to leads</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads" className="text-slate-500 hover:text-slate-700 text-sm">← Leads</Link>
        <h1 className="text-2xl font-semibold text-slate-800">{lead.name}</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
            <input
              type="text"
              value={edit.name ?? ''}
              onChange={(e) => setEdit((e2) => ({ ...e2, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
            <input
              type="text"
              value={edit.phone ?? ''}
              onChange={(e) => setEdit((e2) => ({ ...e2, phone: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Source</label>
            <select
              value={edit.source ?? ''}
              onChange={(e) => setEdit((e2) => ({ ...e2, source: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={edit.status ?? 'NEW'}
              onChange={(e) => setEdit((e2) => ({ ...e2, status: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Next follow-up</label>
            <input
              type="datetime-local"
              value={edit.nextFollowUpAt ? new Date(edit.nextFollowUpAt).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEdit((e2) => ({ ...e2, nextFollowUpAt: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-medium text-slate-800">Generate follow-up</h2>
          <button
            onClick={handleGenerateFollowup}
            disabled={aiLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {aiLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              'Generate follow-up'
            )}
          </button>
        </div>
        {aiResult && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            {aiResult.whatsappMessage && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">WhatsApp message</p>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{aiResult.whatsappMessage}</p>
              </div>
            )}
            {aiResult.callScript && aiResult.callScript.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Call script</p>
                <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
                  {aiResult.callScript.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiResult.objectionHandling && aiResult.objectionHandling !== 'N/A - not needed for this status' && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Objection handling</p>
                <p className="text-slate-700 text-sm whitespace-pre-wrap">{aiResult.objectionHandling}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Activity timeline</h2>
        {activities.length === 0 && !timelineLoading ? (
          <p className="text-slate-500 text-sm">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => (
              <li key={a._id} className="flex gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs font-medium text-slate-500 shrink-0 w-24">
                  {ACTIVITY_LABELS[a.type] || a.type}
                </span>
                <div className="text-sm text-slate-700 min-w-0">
                  {a.type === 'STATUS_CHANGE' && a.meta && (
                    <span>
                      {(a.meta as { previousStatus?: string }).previousStatus ?? '—'} → {(a.meta as { newStatus?: string }).newStatus ?? '—'}
                    </span>
                  )}
                  {a.type === 'AI_MESSAGE_GENERATED' && <span>AI follow-up generated</span>}
                  {!['STATUS_CHANGE', 'AI_MESSAGE_GENERATED'].includes(a.type) && a.meta && (
                    <span>{JSON.stringify(a.meta)}</span>
                  )}
                </div>
                <span className="text-xs text-slate-400 shrink-0 ml-auto">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        {nextCursor && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => fetchTimeline(nextCursor)}
              disabled={timelineLoading}
              className="text-sm text-emerald-600 hover:underline disabled:opacity-50"
            >
              {timelineLoading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
