// Force this route to be dynamic — avoids prerender error (useSearchParams + client fetch).
export const dynamic = 'force-dynamic';

import LeadsPageClient from './LeadsPageClient';

export default function LeadsPage() {
  return <LeadsPageClient />;
}
