// Force dynamic so dashboard/leads etc. are never statically prerendered at build time.
export const dynamic = 'force-dynamic';

import AppLayoutClient from './AppLayoutClient';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
