const TOKEN_KEY = 'xorai_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  // Static demo mode: a host page can bake API responses into
  // window.__XORAI_DATA__ and run the whole app without a server.
  const staticData = typeof window !== 'undefined' && window.__XORAI_DATA__;
  if (staticData) {
    if (path.startsWith('/auth/')) {
      return { token: 'static-demo', user: staticData.user };
    }
    const hit = staticData.responses[path];
    if (hit) return structuredClone(hit);
    throw new ApiError('Not available in the static demo', 404);
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}
