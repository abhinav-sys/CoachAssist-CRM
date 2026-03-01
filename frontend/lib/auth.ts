export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

export function requireAuth(): boolean {
  if (typeof window === 'undefined') return false;
  const ok = !!localStorage.getItem('token');
  if (!ok) {
    window.location.href = '/login';
  }
  return ok;
}
