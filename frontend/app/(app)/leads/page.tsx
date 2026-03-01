'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-slate-500 text-white',
  CONTACTED: 'bg-blue-500 text-white',
  INTERESTED: 'bg-amber-500 text-white',
  CONVERTED: 'bg-emerald-600 text-white',
  LOST: 'bg-slate-400 text-white',
};

const STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'LOST'];
const SOURCES = ['Instagram', 'Referral', 'Ads'];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [tagsInput, setTagsInput] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: '', tags: '' });

  const fetchLeads = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!append) setLoading(true);
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (tagsInput.trim()) params.set('tags', tagsInput.trim());
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('page', String(pageNum));
      const { data, error } = await api<{ leads: Lead[]; total: number; page: number }>(
        `/leads?${params}`
      );
      if (!append) setLoading(false);
      if (error) {
        toast.error(error);
        return;
      }
      if (data) {
        if (append) setLeads((prev) => [...prev, ...data.leads]);
        else setLeads(data.leads);
        setTotal(data.total);
      }
    },
    [status, tagsInput, debouncedSearch]
  );

  useEffect(() => {
    setPage(1);
    fetchLeads(1, false);
  }, [status, tagsInput, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (page > 1) fetchLeads(page, true);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setFormLoading(true);
    const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const { data, error } = await api<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        source: form.source || undefined,
        tags: tags.length ? tags : undefined,
      }),
    });
    setFormLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      toast.success('Lead added');
      setModalOpen(false);
      setForm({ name: '', phone: '', source: '', tags: '' });
      fetchLeads(1, false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Leads</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
        >
          Add Lead
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Tags</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vip, hot"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Search (name/phone)</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No leads match your filters. Add a lead to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Phone</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Source</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase px-4 py-3">Next follow-up</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead._id}
                    onClick={() => router.push(`/leads/${lead._id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.source || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[lead.status] || 'bg-slate-400 text-white'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > leads.length && (
          <div className="p-3 border-t border-slate-200 flex justify-center">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-emerald-600 hover:underline"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Lead</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="vip, hot"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  {formLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
