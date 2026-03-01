// Force dynamic rendering so /leads is not statically prerendered at build time.
// The leads page uses useSearchParams() and client-side data fetching.
export const dynamic = 'force-dynamic';

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
