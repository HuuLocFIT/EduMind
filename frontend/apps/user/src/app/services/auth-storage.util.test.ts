import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredAccessToken, getStoredUser } from './auth-storage.util';

describe('auth-storage.util', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when auth-storage is absent', () => {
    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('reads accessToken and user from the Zustand-persisted auth-storage snapshot', () => {
    const user = { id: 1, username: 'testuser' };
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({ state: { user, accessToken: 'snapshot-token', isAuthenticated: true }, version: 0 })
    );

    expect(getStoredAccessToken()).toBe('snapshot-token');
    expect(getStoredUser()).toEqual(user);
  });

  it('returns null when auth-storage is malformed JSON', () => {
    localStorage.setItem('auth-storage', 'not-json{');

    expect(getStoredAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });
});
