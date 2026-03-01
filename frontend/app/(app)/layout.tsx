'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { requireAuth } from '@/lib/auth';
import { clearToken } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!requireAuth()) return;
  }, []);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-800">
            CoachAssist
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className={`text-sm font-medium ${pathname === '/dashboard' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Dashboard
            </Link>
            <Link
              href="/leads"
              className={`text-sm font-medium ${pathname?.startsWith('/leads') ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Leads
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
