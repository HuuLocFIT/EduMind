import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Integration-style coverage for the auth-session generation guard.
 *
 * Unlike auth.store.test.ts (which mocks api-client.service wholesale) and
 * api-client.service.test.ts (which calls invalidateAuthSession() by hand), this file runs
 * the REAL store against the REAL refresh pipeline with only the network mocked. That is
 * the only way to catch the failure mode these two miss: a store action that invalidates
 * the session too late — after its first await — leaving a whole round-trip during which a
 * refresh belonging to the previous session is still treated as current.
 *
 * Every case asserts the state WHILE the boundary action is still in flight. Asserting the
 * final state proves nothing: the login/logout that follows overwrites the damage, so a
 * late invalidation still converges and the test would pass with the bug present.
 */

const { mockAxiosPost, mockAxiosGet, mockLogin, mockLoginWith2FA, mockLogout, mockFetchCurrentUser, mockQueryClientClear } =
  vi.hoisted(() => ({
    mockAxiosPost: vi.fn(),
    mockAxiosGet: vi.fn(),
    mockLogin: vi.fn(),
    mockLoginWith2FA: vi.fn(),
    mockLogout: vi.fn(),
    mockFetchCurrentUser: vi.fn(),
    mockQueryClientClear: vi.fn(),
  }));

// Only the network is mocked — api-client.service itself stays real. axios.create() comes
// from the real module so the apiClient instance is still built normally.
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

vi.mock('../services/auth.service', () => ({
  authService: {
    login: mockLogin,
    loginWith2FA: mockLoginWith2FA,
    logout: mockLogout,
    fetchCurrentUser: mockFetchCurrentUser,
    signup: vi.fn(),
  },
}));

vi.mock('../lib/query-client', () => ({
  queryClient: { clear: mockQueryClientClear },
}));

import { useAuthStore } from './auth.store';
import { refreshAuthSession, isStaleAuthSessionError } from '../services/api-client.service';

const userA = {
  id: 1,
  username: 'user-a',
  email: 'a@example.com',
  roles: ['ROLE_STUDENT'],
  isActive: true,
  isEmailVerified: true,
  is2faEnabled: false,
  isTrial: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const userB = { ...userA, id: 2, username: 'user-b', email: 'b@example.com' };

const envelope = (data: unknown) => ({ status: 200, success: true, data });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Kicks off a refresh for the CURRENT session and leaves it hanging on the network. */
function startPendingRefresh() {
  const post = deferred<unknown>();
  mockAxiosPost.mockReturnValue(post.promise);
  const result = refreshAuthSession().then(
    (value) => ({ ok: true as const, value }),
    (error) => ({ ok: false as const, error }),
  );
  return {
    result,
    land: (accessToken: string) =>
      post.resolve({ data: envelope({ accessToken, tokenType: 'Bearer', user: userA }) }),
  };
}

// vi.spyOn is generic, so `ReturnType<typeof vi.spyOn>` resolves against its unconstrained
// default type params rather than this call site's — wrapping it in a concrete function lets
// ReturnType infer the actual MockInstance<(event: Event) => boolean> type.
function spyOnWindowDispatchEvent() {
  return vi.spyOn(window, 'dispatchEvent');
}

describe('auth session boundaries — a refresh in flight must not survive them', () => {
  let dispatchSpy: ReturnType<typeof spyOnWindowDispatchEvent>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().clearAuthState();
    // Seed a logged-in session A, the one the pending refresh will belong to.
    useAuthStore.setState({ user: userA as never, accessToken: 'session-a-token', isAuthenticated: true });
    localStorage.setItem('accessToken', 'session-a-token');
    dispatchSpy = spyOnWindowDispatchEvent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const userRefreshedCount = () =>
    dispatchSpy.mock.calls
      .map(([event]) => event as CustomEvent)
      .filter((event) => event.type === 'auth:user-refreshed').length;

  /** Asserts a refresh landing *during* `inFlightBoundary` is rejected and writes nothing. */
  const expectRefreshRejectedDuring = async (refresh: ReturnType<typeof startPendingRefresh>) => {
    refresh.land('resurrected-token');
    const outcome = await refresh.result;

    expect(outcome.ok).toBe(false);
    expect(isStaleAuthSessionError((outcome as { error: unknown }).error)).toBe(true);
    expect(localStorage.getItem('accessToken')).not.toBe('resurrected-token');
    expect(localStorage.getItem('user')).toBeNull();
    expect(userRefreshedCount()).toBe(0);
    expect(useAuthStore.getState().accessToken).not.toBe('resurrected-token');
  };

  it('login: the credentials request is already a new session', async () => {
    const loginCall = deferred<unknown>();
    mockLogin.mockReturnValue(loginCall.promise);

    const refresh = startPendingRefresh();
    const loginDone = useAuthStore.getState().login({ usernameOrEmail: 'b', password: 'p' });

    await expectRefreshRejectedDuring(refresh);

    loginCall.resolve({ accessToken: 'token-b', user: userB });
    await loginDone;
    expect(useAuthStore.getState().user?.id).toBe(2);
  });

  it('login: a FAILED login still discards the previous session\'s refresh', async () => {
    const loginCall = deferred<unknown>();
    mockLogin.mockReturnValue(loginCall.promise);

    const refresh = startPendingRefresh();
    const loginDone = useAuthStore
      .getState()
      .login({ usernameOrEmail: 'b', password: 'wrong' })
      .catch(() => undefined);

    await expectRefreshRejectedDuring(refresh);

    loginCall.reject(new Error('Invalid credentials'));
    await loginDone;
  });

  it('loginWith2FA: the code-verification request is already a new session', async () => {
    const verifyCall = deferred<unknown>();
    mockLoginWith2FA.mockReturnValue(verifyCall.promise);
    mockFetchCurrentUser.mockResolvedValue(userB);

    const refresh = startPendingRefresh();
    const loginDone = useAuthStore.getState().loginWith2FA({ email: 'b@example.com', code: '123456' } as never);

    await expectRefreshRejectedDuring(refresh);

    verifyCall.resolve({ accessToken: 'token-b', tokenType: 'Bearer' });
    await loginDone;
    expect(useAuthStore.getState().user?.id).toBe(2);
  });

  it('loginWithOAuth2: the /users/me fetch is already a new session', async () => {
    const meCall = deferred<unknown>();
    mockFetchCurrentUser.mockReturnValue(meCall.promise);

    const refresh = startPendingRefresh();
    const loginDone = useAuthStore.getState().loginWithOAuth2('oauth-token-b');

    // loginWithOAuth2 writes its own token synchronously before awaiting; the refresh
    // must not be able to replace it while /users/me is in flight.
    refresh.land('resurrected-token');
    const outcome = await refresh.result;
    expect(isStaleAuthSessionError((outcome as { error: unknown }).error)).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('oauth-token-b');
    expect(userRefreshedCount()).toBe(0);

    meCall.resolve(userB);
    await loginDone;
    expect(useAuthStore.getState().user?.id).toBe(2);
  });

  it('logout: a slow logout request does not leave a window to write the token back', async () => {
    const logoutCall = deferred<unknown>();
    mockLogout.mockReturnValue(logoutCall.promise);

    const refresh = startPendingRefresh();
    const logoutDone = useAuthStore.getState().logout();

    await expectRefreshRejectedDuring(refresh);

    logoutCall.resolve({ message: 'ok' });
    await logoutDone;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('logout: still discards the refresh when the logout API fails', async () => {
    const logoutCall = deferred<unknown>();
    mockLogout.mockReturnValue(logoutCall.promise);

    const refresh = startPendingRefresh();
    const logoutDone = useAuthStore.getState().logout();

    await expectRefreshRejectedDuring(refresh);

    logoutCall.reject(new Error('Network Error'));
    await logoutDone;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('clearAuthState: synchronous, so the refresh is stale from the moment it returns', async () => {
    const refresh = startPendingRefresh();

    useAuthStore.getState().clearAuthState();

    await expectRefreshRejectedDuring(refresh);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

/**
 * The flip side of the guard above: making a refresh stale means it stops reporting its own
 * completion, so whoever made it stale owes the store an isRefreshingSession reset. Nobody
 * else will do it on a FAILED login — there is no success set() to fall back on — and a flag
 * stuck on leaves TeacherGuard rendering "Verifying access…" for good.
 */
describe('auth session boundaries — refresh state survives a failed auth attempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.getState().clearAuthState();
    useAuthStore.setState({ user: userA as never, accessToken: 'session-a-token', isAuthenticated: true });
    localStorage.setItem('accessToken', 'session-a-token');
  });

  /** Puts the store into a real isRefreshingSession=true via the store action itself. */
  const startRefreshingSession = () => {
    const post = deferred<unknown>();
    mockAxiosPost.mockReturnValue(post.promise);
    const done = useAuthStore.getState().refreshSession();
    expect(useAuthStore.getState().isRefreshingSession).toBe(true);
    return {
      done,
      land: () =>
        post.resolve({ data: envelope({ accessToken: 'resurrected-token', tokenType: 'Bearer', user: userA }) }),
    };
  };

  const failedAttempts: Array<[string, () => { attempt: Promise<unknown>; fail: () => void }]> = [
    ['login', () => {
      const call = deferred<unknown>();
      mockLogin.mockReturnValue(call.promise);
      return {
        attempt: useAuthStore.getState().login({ usernameOrEmail: 'b', password: 'wrong' }).catch(() => undefined),
        fail: () => call.reject(new Error('Invalid credentials')),
      };
    }],
    ['loginWith2FA', () => {
      const call = deferred<unknown>();
      mockLoginWith2FA.mockReturnValue(call.promise);
      return {
        attempt: useAuthStore
          .getState()
          .loginWith2FA({ email: 'b@example.com', code: '000000' } as never)
          .catch(() => undefined),
        fail: () => call.reject(new Error('Invalid code')),
      };
    }],
    ['loginWithOAuth2', () => {
      const call = deferred<unknown>();
      mockFetchCurrentUser.mockReturnValue(call.promise);
      return {
        attempt: useAuthStore.getState().loginWithOAuth2('bad-oauth-token').catch(() => undefined),
        fail: () => call.reject(new Error('Unauthorized')),
      };
    }],
  ];

  it.each(failedAttempts)('%s clears isRefreshingSession the moment it starts', async (_name, start) => {
    const refreshing = startRefreshingSession();

    const { attempt, fail } = start();
    // Reset happens at the START of the attempt, not on success — there is no success here.
    expect(useAuthStore.getState().isRefreshingSession).toBe(false);

    refreshing.land();
    await refreshing.done;
    fail();
    await attempt;

    const state = useAuthStore.getState();
    expect(state.isRefreshingSession).toBe(false);
    expect(state.sessionRefreshError).toBeNull();
  });

  it('keeps sessionExpiredReason across a failed login — the user still has no session', async () => {
    useAuthStore.setState({ sessionExpiredReason: 'SESSION_EXPIRED' });
    const call = deferred<unknown>();
    mockLogin.mockReturnValue(call.promise);

    const attempt = useAuthStore.getState().login({ usernameOrEmail: 'b', password: 'wrong' }).catch(() => undefined);
    call.reject(new Error('Invalid credentials'));
    await attempt;

    expect(useAuthStore.getState().sessionExpiredReason).toBe('SESSION_EXPIRED');
  });

  it('retires sessionExpiredReason once a login succeeds', async () => {
    useAuthStore.setState({ sessionExpiredReason: 'SESSION_EXPIRED' });
    mockLogin.mockResolvedValue({ accessToken: 'token-b', user: userB });

    await useAuthStore.getState().login({ usernameOrEmail: 'b', password: 'right' });

    expect(useAuthStore.getState().sessionExpiredReason).toBeNull();
  });
});
