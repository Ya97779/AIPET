const API_BASE = '/api';

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 30_000; // 30 seconds

async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T>(path: string, force = false): Promise<T> {
  const key = path;
  const now = Date.now();

  if (!force) {
    const cached = cache.get(key);
    if (cached && cached.expires > now) return cached.data as T;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  cache.set(key, { data, expires: now + CACHE_TTL });
  return data;
}

export function invalidateCache(pattern?: string) {
  if (!pattern) { cache.clear(); return; }
  for (const key of Array.from(cache.keys())) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  // Invalidate related cache on POST
  invalidateCache('/consultation');
  invalidateCache('/recipe');
  invalidateCache('/mall');
  invalidateCache('/community');
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}
