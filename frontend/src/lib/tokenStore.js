/**
 * Module-level token cache.
 *
 * Initialized SYNCHRONOUSLY from localStorage at import time — before any
 * React renders or Zustand hydration. This guarantees the axios interceptor
 * always has the current token regardless of React/Zustand lifecycle timing.
 *
 * Updated by authStore actions (setAuth, setToken, logout) to stay in sync.
 */
let _token = null;

try {
  const raw = localStorage.getItem('auth-storage');
  if (raw) {
    const parsed = JSON.parse(raw);
    _token = parsed?.state?.accessToken ?? null;
  }
} catch {
  _token = null;
}

export const getToken = () => _token;
export const updateToken = (token) => { _token = token ?? null; };
export const clearToken = () => { _token = null; };
