const SESSION_KEY = 'signalroom_session';

export interface Session {
  token: string;
  workspace: { id: number; name: string; isDemo: boolean };
  user: { id: number; name: string; email: string } | null;
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { signal?: AbortSignal } = {}): Promise<T> {
  const session = loadSession();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const err = (body ?? {}) as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(
      err.error?.message ?? `Request failed (${res.status})`,
      res.status,
      err.error?.code ?? 'unknown',
      err.error?.details
    );
  }
  return body as T;
}
