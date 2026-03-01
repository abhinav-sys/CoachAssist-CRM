const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/** Skip API calls when the system has no backend URL (e.g. build or missing env). */
function getBaseUrl(): string | null {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === 'undefined') {
    if (!envUrl || String(envUrl).trim() === '') return null;
    return String(envUrl).trim().replace(/\/$/, '');
  }
  const base = envUrl && String(envUrl).trim() !== '' ? String(envUrl).trim() : 'http://localhost:5000';
  return base.replace(/\/$/, '');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return {
      error: 'API URL not configured. Set NEXT_PUBLIC_API_URL in your environment.',
      status: 0,
    };
  }

  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return {
      error: message === 'Failed to fetch'
        ? 'Cannot reach the server. Check that the backend is running and NEXT_PUBLIC_API_URL is correct.'
        : message,
      status: 0,
    };
  }

  const status = res.status;
  let data: T | undefined;
  let error: string | undefined;
  const text = await res.text();
  try {
    const parsed = text ? JSON.parse(text) : {};
    data = parsed as T;
    if (!res.ok) error = (parsed as { error?: string }).error || res.statusText;
  } catch {
    error = res.statusText || 'Request failed';
  }

  // Invalid or expired token: clear and send user to login
  if (status === 401 || (error && /invalid|expired.*token/i.test(error))) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  return { data, error, status };
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('token', token);
}

export function clearToken() {
  if (typeof window !== 'undefined') localStorage.removeItem('token');
}

export { API_URL };
