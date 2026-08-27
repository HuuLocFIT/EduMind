import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockAxiosPost = vi.fn();
const mockAxiosGet = vi.fn();

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...(actual as any).default,
      post: (...args: unknown[]) => mockAxiosPost(...args),
      get: (...args: unknown[]) => mockAxiosGet(...args),
    },
  };
});

import {
  apiClient,
  refreshAuthSession,
  isTerminalRefreshFailure,
  isStaleAuthSessionError,
  invalidateAuthSession,
  clearStoredAuth,
  validateUserPortalIdentity,
  isPortalIdentityRejectedError,
  PortalIdentityRejectedError,
  fetchCurrentUserWith,
} from './api-client.service';

const validUser = {
  id: 1,
  username: 'jane',
  email: 'jane@example.com',
  roles: ['ROLE_STUDENT', 'ROLE_TEACHER'],
  isActive: true,
  isEmailVerified: true,
  is2faEnabled: false,
  isTrial: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const envelope = (data: unknown) => ({ status: 200, success: true, data });

describe('clearStoredAuth', () => {
  it('removes accessToken, user, and auth-storage from localStorage', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    localStorage.setItem('auth-storage', '{}');

    clearStoredAuth();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });
});

describe('validateUserPortalIdentity', () => {
  it('does not throw for a non-admin user', () => {
    expect(() => validateUserPortalIdentity(validUser)).not.toThrow();
  });

  it('throws PortalIdentityRejectedError for a user with ROLE_ADMIN', () => {
    const admin = { ...validUser, roles: ['ROLE_ADMIN'] };
    expect(() => validateUserPortalIdentity(admin as never)).toThrow(PortalIdentityRejectedError);
  });

  it('throws for a multi-role user that includes ROLE_ADMIN', () => {
    const multiRole = { ...validUser, roles: ['ROLE_STUDENT', 'ROLE_ADMIN'] };
    expect(() => validateUserPortalIdentity(multiRole as never)).toThrow(PortalIdentityRejectedError);
  });

  it('the rejected error carries the rejected user', () => {
    const admin = { ...validUser, roles: ['ROLE_ADMIN'] };
    try {
      validateUserPortalIdentity(admin as never);
      throw new Error('expected validateUserPortalIdentity to throw');
    } catch (error) {
      expect(isPortalIdentityRejectedError(error)).toBe(true);
      expect((error as PortalIdentityRejectedError).rejectedUser).toEqual(admin);
    }
  });
});

describe('fetchCurrentUserWith', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAxiosGet.mockReset();
  });

  it('fetches /users/me with the given token, ignoring any token in localStorage', async () => {
    localStorage.setItem('accessToken', 'stale-token');
    mockAxiosGet.mockResolvedValue({ data: envelope(validUser) });

    const user = await fetchCurrentUserWith('candidate-token');

    expect(user).toEqual(validUser);
    const [, config] = mockAxiosGet.mock.calls[0];
    expect(config.headers.Authorization).toBe('Bearer candidate-token');
  });
});

describe('refreshAuthSession — portal identity rejection', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAxiosPost.mockReset();
  });

  it('rejects with PortalIdentityRejectedError and persists nothing when the refreshed identity is an admin', async () => {
    const admin = { ...validUser, roles: ['ROLE_ADMIN'] };
    mockAxiosPost.mockResolvedValue({
      data: envelope({ accessToken: 'admin-token', tokenType: 'Bearer', user: admin }),
    });

    let caught: unknown;
    try {
      await refreshAuthSession();
    } catch (error) {
      caught = error;
    }

    expect(isPortalIdentityRejectedError(caught)).toBe(true);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});

describe('isTerminalRefreshFailure', () => {
  it('returns true for ERR_2004', () => {
    const error = {
      response: {
        data: { message: 'Refresh token expired', status: 403, timestamp: '2026-01-01', errorCode: 'ERR_2004' },
      },
    };
    expect(isTerminalRefreshFailure(error)).toBe(true);
  });

  it('returns false for a different error code', () => {
    const error = {
      response: {
        data: { message: 'Server error', status: 500, timestamp: '2026-01-01', errorCode: 'ERR_9999' },
      },
    };
    expect(isTerminalRefreshFailure(error)).toBe(false);
  });

  it('returns false for a network error with no response', () => {
    expect(isTerminalRefreshFailure(new Error('Network Error'))).toBe(false);
  });

  it('returns false when response.data does not match ApiErrorSchema', () => {
    const error = { response: { data: { unexpected: true } } };
    expect(isTerminalRefreshFailure(error)).toBe(false);
  });
});

describe('refreshAuthSession', () => {
  beforeEach(() => {
    localStorage.clear();
    mockAxiosPost.mockReset();
    mockAxiosGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists the new access token and user, and dispatches auth:user-refreshed', async () => {
    mockAxiosPost.mockResolvedValue({
      data: envelope({ accessToken: 'new-token', tokenType: 'Bearer', user: validUser }),
    });
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const result = await refreshAuthSession();

    expect(result.accessToken).toBe('new-token');
    expect(result.user).toEqual(validUser);
    expect(localStorage.getItem('accessToken')).toBe('new-token');
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(validUser);
    expect(mockAxiosGet).not.toHaveBeenCalled();

    const dispatched = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .find((event) => event.type === 'auth:user-refreshed');
    expect(dispatched).toBeDefined();
    expect(dispatched?.detail).toEqual({ user: validUser, accessToken: 'new-token' });
  });

  it('rejects when the refresh response omits user (contract violation, no fallback)', async () => {
    mockAxiosPost.mockResolvedValue({
      data: envelope({ accessToken: 'new-token', tokenType: 'Bearer' }),
    });

    await expect(refreshAuthSession()).rejects.toBeTruthy();
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('dedupes concurrent callers into a single POST /auth/refresh', async () => {
    let resolvePost!: (value: unknown) => void;
    mockAxiosPost.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );

    const first = refreshAuthSession();
    const second = refreshAuthSession();

    resolvePost({ data: envelope({ accessToken: 'shared-token', tokenType: 'Bearer', user: validUser }) });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(firstResult.accessToken).toBe('shared-token');
    expect(secondResult.accessToken).toBe('shared-token');
  });

  it('allows a new POST after the previous refresh settled', async () => {
    mockAxiosPost.mockResolvedValue({
      data: envelope({ accessToken: 'token-1', tokenType: 'Bearer', user: validUser }),
    });
    await refreshAuthSession();

    mockAxiosPost.mockResolvedValue({
      data: envelope({ accessToken: 'token-2', tokenType: 'Bearer', user: validUser }),
    });
    await refreshAuthSession();

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
  });

  it('rejects with a ZodError (not a terminal failure) when the refresh response is malformed', async () => {
    mockAxiosPost.mockResolvedValue({ data: envelope({ tokenType: 'Bearer' }) }); // missing accessToken

    await expect(refreshAuthSession()).rejects.toBeTruthy();
    let caught: unknown;
    try {
      await refreshAuthSession();
    } catch (error) {
      caught = error;
    }
    expect(isTerminalRefreshFailure(caught)).toBe(false);
  });

  it('propagates a network error as non-terminal', async () => {
    const networkError = { message: 'Network Error' }; // no response object at all
    mockAxiosPost.mockRejectedValue(networkError);

    await expect(refreshAuthSession()).rejects.toBe(networkError);
    expect(isTerminalRefreshFailure(networkError)).toBe(false);
  });
});

describe('refreshAuthSession — session changed while in flight', () => {
  const pendingPost = () => {
    let resolvePost!: (value: unknown) => void;
    mockAxiosPost.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));
    return (accessToken: string, user: unknown = validUser) =>
      resolvePost({ data: envelope({ accessToken, tokenType: 'Bearer', user }) });
  };

  beforeEach(() => {
    localStorage.clear();
    mockAxiosPost.mockReset();
    mockAxiosGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not restore the access token or notify the store when the session ended mid-refresh', async () => {
    const settle = pendingPost();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const refresh = refreshAuthSession();

    // Logout happens while the refresh is still on the wire.
    invalidateAuthSession();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');

    settle('resurrected-token');

    let caught: unknown;
    await refresh.catch((error) => { caught = error; });

    expect(isStaleAuthSessionError(caught)).toBe(true);
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    const dispatched = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .some((event) => event.type === 'auth:user-refreshed');
    expect(dispatched).toBe(false);
  });

  it('does not overwrite the identity of a user who logged in mid-refresh', async () => {
    const settle = pendingPost();
    const refresh = refreshAuthSession();

    // User A's refresh is in flight; user B logs in and owns the session from here on.
    invalidateAuthSession();
    localStorage.setItem('accessToken', 'user-b-token');
    localStorage.setItem('user', JSON.stringify({ ...validUser, id: 2, username: 'user-b' }));

    settle('user-a-token', { ...validUser, id: 1, username: 'user-a' });
    await refresh.catch(() => undefined);

    expect(localStorage.getItem('accessToken')).toBe('user-b-token');
    expect(JSON.parse(localStorage.getItem('user')!).username).toBe('user-b');
  });

  it('starts a fresh request instead of handing out the invalidated session promise', async () => {
    pendingPost();
    void refreshAuthSession().catch(() => undefined);

    invalidateAuthSession();

    mockAxiosPost.mockResolvedValue({
      data: envelope({ accessToken: 'new-session-token', tokenType: 'Bearer', user: validUser }),
    });
    const result = await refreshAuthSession();

    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    expect(result.accessToken).toBe('new-session-token');
    expect(localStorage.getItem('accessToken')).toBe('new-session-token');
  });
});

describe('apiClient response interceptor — 401 refresh handling', () => {
  const getRejectedHandler = () => {
    const handlers = (apiClient.interceptors.response as any).handlers;
    return handlers[handlers.length - 1].rejected as (error: unknown) => Promise<unknown>;
  };

  beforeEach(() => {
    localStorage.clear();
    mockAxiosPost.mockReset();
    mockAxiosGet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const build401Error = () => ({
    config: { url: '/api/courses', headers: {} as Record<string, string> },
    response: {
      status: 401,
      data: { message: 'Unauthorized', status: 401, timestamp: '2026-01-01', errorCode: 'ERR_9999' },
    },
  });

  it('clears auth and dispatches auth:session-expired only on a terminal (ERR_2004) refresh failure', async () => {
    mockAxiosPost.mockRejectedValue({
      response: {
        data: { message: 'Refresh token expired', status: 403, timestamp: '2026-01-01', errorCode: 'ERR_2004' },
      },
    });
    localStorage.setItem('accessToken', 'stale-token');
    localStorage.setItem('user', JSON.stringify(validUser));
    localStorage.setItem('auth-storage', '{}');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    await expect(getRejectedHandler()(build401Error())).rejects.toBeTruthy();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('auth-storage')).toBeNull();
    const dispatched = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .some((event) => event.type === 'auth:session-expired');
    expect(dispatched).toBe(true);
  });

  describe('rejects with an ApiError, never the refresh call\'s own exception', () => {
    // Callers never issued /auth/refresh; they are typed for the ApiError every other exit
    // from this interceptor produces. CheckoutPage:266 already hedges with
    // `err.errorCode || err.response?.data?.errorCode` — that hedge is this leak.
    type ApiErrorLike = {
      errorCode?: string;
      message?: string;
      status?: number;
      timestamp?: string;
      response?: unknown;
    };

    const rejectionOf = async (error: unknown) => {
      try {
        await getRejectedHandler()(error);
        throw new Error('expected the interceptor to reject');
      } catch (thrown) {
        return thrown as ApiErrorLike;
      }
    };

    it('surfaces the refresh envelope (ERR_2004) as a flat ApiError on a terminal failure', async () => {
      mockAxiosPost.mockRejectedValue({
        response: {
          data: { message: 'Refresh token expired', status: 403, timestamp: '2026-01-01', errorCode: 'ERR_2004' },
        },
      });

      const rejection = await rejectionOf(build401Error());

      expect(rejection.errorCode).toBe('ERR_2004');
      expect(rejection.message).toBe('Refresh token expired');
      expect(rejection.response).toBeUndefined(); // not an AxiosError
    });

    it('reports the refresh failure with a retriable status, not the original 401', async () => {
      // Status 0, not the original request's 401: the refresh died on the network, and
      // TanStack Query's shouldRetry writes off 4xx but retries this.
      mockAxiosPost.mockRejectedValue({ message: 'Network Error' });

      const rejection = await rejectionOf(build401Error());

      expect(rejection.message).toBe('Unable to refresh your session. Please try again.');
      expect(rejection.status).toBe(0);
      expect(rejection.errorCode).toBeUndefined();
      expect(rejection.timestamp).toBeDefined();
    });

    it('keeps a ZodError from the refresh response out of the caller\'s message', async () => {
      mockAxiosPost.mockResolvedValue({ data: envelope({ tokenType: 'Bearer' }) }); // no accessToken

      const rejection = await rejectionOf(build401Error());

      expect(rejection.message).toBe('Unable to refresh your session. Please try again.');
      expect(String(rejection.message)).not.toContain('invalid_type');
      expect(rejection.status).toBe(0);
    });
  });

  it('does NOT clear auth or dispatch auth:session-expired on a temporary (network/5xx) refresh failure', async () => {
    mockAxiosPost.mockRejectedValue({ message: 'Network Error' }); // no response at all
    localStorage.setItem('accessToken', 'stale-token');
    localStorage.setItem('user', JSON.stringify(validUser));
    localStorage.setItem('auth-storage', '{}');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    await expect(getRejectedHandler()(build401Error())).rejects.toBeTruthy();

    expect(localStorage.getItem('accessToken')).toBe('stale-token');
    expect(localStorage.getItem('user')).not.toBeNull();
    expect(localStorage.getItem('auth-storage')).not.toBeNull();
    const dispatched = dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .some((event) => event.type === 'auth:session-expired');
    expect(dispatched).toBe(false);
  });
});
