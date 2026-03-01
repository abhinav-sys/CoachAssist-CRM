'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

type DashboardData = {
  funnelCounts: Record<string, number>;
  conversionRate: number;
  overdueFollowUps: number;
  topSources: { source: string; count: number }[];
  activityGraph: { date: string; count: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-slate-500',
  CONTACTED: 'bg-blue-500',
  INTERESTED: 'bg-amber-500',
  CONVERTED: 'bg-emerald-600',
  LOST: 'bg-slate-400',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: res, error: err } = await api<DashboardData>('/dashboard');
      setLoading(false);
      if (err) {
        setError(err);
        toast.error(err);
        return;
      }
      if (res) setData(res);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-slate-600">
        Failed to load dashboard. {error || 'Unknown error.'}
      </div>
    );
  }

  const funnelEntries = Object.entries(data.funnelCounts).filter(([, v]) => v !== undefined);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Conversion rate</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {(data.conversionRate * 100).toFixed(1)}%
          </p>
        </div>
        <Link
          href="/leads"
          className="bg-white rounded-lg border border-slate-200 p-4 hover:border-emerald-300 transition"
        >
          <p className="text-sm text-slate-500">Overdue follow-ups</p>
          <p className="text-2xl font-semibold text-slate-800">{data.overdueFollowUps}</p>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-medium text-slate-800 mb-4">Funnel</h2>
        <div className="flex flex-wrap gap-3">
          {funnelEntries.map(([status, count]) => (
            <Link
              key={status}
              href={`/leads?status=${status}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100"
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status] || 'bg-slate-400'}`} />
              <span className="text-sm font-medium text-slate-700">{status}</span>
              <span className="text-sm text-slate-500">{count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Top sources</h2>
          {data.topSources.length === 0 ? (
            <p className="text-slate-500 text-sm">No source data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topSources}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-lg font-medium text-slate-800 mb-4">Activity (last 7 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.activityGraph}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
