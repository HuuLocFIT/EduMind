import type { User } from '@edumind/shared-types';

/**
 * The Zustand persist key auth.store.ts writes to — the single source of truth for the
 * user portal's auth snapshot. Code that runs outside the store (axios interceptors, raw
 * fetch calls, non-React services) reads it directly here instead of importing the store,
 * which would create a cycle with api-client.service.ts (auth.store already imports from it).
 */
const AUTH_STORAGE_KEY = 'auth-storage';

interface PersistedAuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

function readAuthStorage(): PersistedAuthState | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.state ?? null;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return readAuthStorage()?.accessToken ?? null;
}

export function getStoredUser(): User | null {
  return readAuthStorage()?.user ?? null;
}
