import type { ApiError, Session } from './types';

const SESSION_KEY = 'qc.store.session';
const BASE = '/api/store/v1';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body?.message ?? `Something went wrong (${status})`);
    this.name = 'ApiRequestError';
  }

  get code(): string {
    return this.body?.code ?? 'UNKNOWN';
  }
}

/* ------------------------------------------------------------- session */

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private window: this tab still works, it just will not be remembered */
  }
  window.dispatchEvent(new Event('qc-store-session'));
}

/* ------------------------------------------------------------- refresh */

/**
 * Refresh is single-flight.
 *
 * The home page fires several queries at once. On a stale token that would
 * be several refresh requests, and because refresh tokens rotate, all but
 * the first would present an already-used token - which the server
 * correctly treats as theft and answers by revoking the whole family. The
 * shopper would be signed out mid-basket. So: one promise, everybody waits.
 */
let refreshInFlight: Promise<Session | null> | null = null;

async function refreshSession(): Promise<Session | null> {
  if (refreshInFlight) return refreshInFlight;

  const current = loadSession();
  if (!current?.refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!response.ok) {
        saveSession(null);
        return null;
      }
      const session = (await response.json()) as Session;
      saveSession(session);
      return session;
    } catch {
      return null;
    } finally {
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();

  return refreshInFlight;
}

/* --------------------------------------------------------------- fetch */

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** internal: stops an infinite refresh loop */
  retrying?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, retrying, headers, ...rest } = options;
  const session = loadSession();

  const response = await fetch(path.startsWith('/api') ? path : `${BASE}${path}`, {
    ...rest,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && !retrying && session?.refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, { ...options, retrying: true });
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) throw new ApiRequestError(response.status, parsed as ApiError);
  return parsed as T;
}

export const get = <T>(path: string) => request<T>(path);
export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body });
export const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body });
export const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });
