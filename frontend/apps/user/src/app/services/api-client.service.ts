import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  JwtResponseSchema,
  RefreshTokenResponseSchema,
  MessageResponseSchema,
  Setup2FAResponseSchema,
  ApiErrorSchema,
  type ApiError,
  type RefreshTokenResponse,
} from '@edumind/shared-types';
import {
  unwrapApiResponse,
  AUTH_ENDPOINTS,
  API_URL,
} from '@edumind/shared-utils';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // IMPORTANT: Send cookies with every request
});

// Track ongoing refresh session request to avoid multiple simultaneous refreshes
let refreshTokenPromise: Promise<RefreshTokenResponse> | null = null;

// Identity of the auth session a refresh belongs to. Bumped on every login/logout so a
// refresh started under a previous session can't write its result over the current one.
let authGeneration = 0;

/**
 * Thrown when a refresh resolves after the session that started it ended (logout, or a
 * different user logging in). Carries no server error — the refresh itself may well have
 * succeeded; its result is simply no longer addressed to anybody.
 */
export class StaleAuthSessionError extends Error {
  constructor() {
    super('Auth session changed while the token refresh was in flight');
    this.name = 'StaleAuthSessionError';
  }
}

export function isStaleAuthSessionError(error: unknown): error is StaleAuthSessionError {
  return error instanceof StaleAuthSessionError;
}

/**
 * Ends the current auth session's identity: any refresh still in flight becomes stale and
 * will neither persist its tokens nor notify the store, and the cached promise is dropped
 * so the next caller starts a fresh request instead of adopting the previous session's one.
 * Call from every login path, logout, and clearAuthState.
 */
export function invalidateAuthSession(): void {
  authGeneration++;
  refreshTokenPromise = null;
}

/** Clears every piece of persisted auth state (access token, user snapshot, Zustand persist key). */
export function clearStoredAuth(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage');
}

/**
 * Reads the server's error envelope off a rejected request, or null if the body isn't one.
 * /auth/refresh and /users/me are called with raw axios, bypassing the response
 * interceptor, so their error bodies have not been parsed yet — hence parsing here.
 */
function parseApiError(error: unknown): ApiError | null {
  const data = (error as AxiosError)?.response?.data;
  const parsed = data ? ApiErrorSchema.safeParse(data) : null;
  return parsed?.success ? parsed.data : null;
}

function synthesizeApiError(message: string, status: number): ApiError {
  return { message, status, timestamp: new Date().toISOString() } as ApiError;
}

/**
 * Terminal refresh failures (missing/revoked/expired refresh token, ERR_2004) mean the
 * session is dead. Everything else (network error, timeout, 5xx, malformed response) is
 * treated as temporary so a flaky connection doesn't log the user out.
 */
export function isTerminalRefreshFailure(error: unknown): boolean {
  return parseApiError(error)?.errorCode === 'ERR_2004';
}

/**
 * Refresh the access token using the refresh token from the HTTP-only cookie, and keep
 * the auth store's user snapshot in sync with the roles the new token carries.
 * Uses a promise cache to dedupe concurrent callers (reactive 401s and proactive callers).
 */
export async function refreshAuthSession(): Promise<RefreshTokenResponse> {
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  const generation = authGeneration;

  refreshTokenPromise = axios
    .post(
      `${API_URL}${AUTH_ENDPOINTS.REFRESH}`,
      {},
      { withCredentials: true }
    )
    .then(async (response) => {
      // Parse, don't cast — this request bypasses the response interceptor's validation.
      const data = RefreshTokenResponseSchema.parse(unwrapApiResponse(response.data));
      const user = data.user;

      // Logout (or a different user logging in) between the request and now means this
      // result belongs to a session that no longer exists: writing it would resurrect a
      // dead token or overwrite the new user's identity. Fail the caller instead — the
      // request it wanted to retry belonged to that dead session too.
      if (generation !== authGeneration) {
        throw new StaleAuthSessionError();
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(user)); // legacy key, still read by auth.service.ts
      // dispatchEvent is synchronous — the store is updated before this promise resolves
      window.dispatchEvent(
        new CustomEvent('auth:user-refreshed', { detail: { user, accessToken: data.accessToken } })
      );

      return { ...data, user };
    })
    .finally(() => {
      // Only clear the cache if it still holds THIS refresh — invalidateAuthSession() may
      // already have dropped it, and a newer refresh must not be evicted by an older one.
      if (generation === authGeneration) {
        refreshTokenPromise = null;
      }
    });

  return refreshTokenPromise;
}

// Request interceptor - Add access token to requests (except auth endpoints)
apiClient.interceptors.request.use(
  (config) => {
    const endpoint = config.url || '';
    
    // Don't add token to auth endpoints (login, signup, 2FA login, etc.)
    const isAuthEndpoint = 
      endpoint.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint.includes(AUTH_ENDPOINTS.LOGIN_2FA) ||
      endpoint.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
      endpoint.includes(AUTH_ENDPOINTS.RESET_PASSWORD) ||
      endpoint.includes(AUTH_ENDPOINTS.VALIDATE_RESET_TOKEN) ||
      endpoint.includes(AUTH_ENDPOINTS.VERIFY_EMAIL) ||
      endpoint.includes(AUTH_ENDPOINTS.RESEND_VERIFICATION) ||
      endpoint.includes('/auth/oauth2');
    
    if (!isAuthEndpoint) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Validate with Zod & handle token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    response.data = unwrapApiResponse(response.data);
    const endpoint = response.config.url;

    // Validate auth responses (login, OAuth2, 2FA)
    if (
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint?.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint?.includes('/auth/oauth2') ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN_2FA)
    ) {
      // Check if response is 2FA required (has requires2FA field)
      if (response.data && typeof response.data === 'object' && 'requires2FA' in response.data && response.data.requires2FA === true) {
        // This is a TwoFactorRequiredResponse, don't validate as JwtResponse
        // Just return it as is
        return response;
      }
      
      // Otherwise, validate as JwtResponse
      const result = JwtResponseSchema.safeParse(response.data);
      if (result.success) {
        // Store access token and user info
        // NOTE: refreshToken is NOT in response - it's in HTTP-Only Cookie
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        response.data = result.data;
      }
    }

    // Validate message responses
    if (
      endpoint?.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESET_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.VERIFY_EMAIL) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESEND_VERIFICATION) ||
      endpoint?.includes(AUTH_ENDPOINTS.VERIFY_2FA) ||
      endpoint?.includes(AUTH_ENDPOINTS.DISABLE_2FA) ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGOUT)
    ) {
      const result = MessageResponseSchema.safeParse(response.data);
      if (result.success) {
        response.data = result.data;
      }
    }

    // Validate 2FA setup response
    if (endpoint?.includes(AUTH_ENDPOINTS.SETUP_2FA)) {
      const result = Setup2FAResponseSchema.safeParse(response.data);
      if (result.success) {
        response.data = result.data;
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const endpoint = originalRequest?.url || '';

    // Validate error response first to get errorCode
    let apiError: ApiError | null = null;
    if (error.response?.data) {
      const result = ApiErrorSchema.safeParse(error.response.data);
      if (result.success) {
        apiError = result.data;
      }
    }

    // Skip token refresh for auth endpoints (login, signup, etc.)
    // These endpoints should not trigger automatic token refresh
    const isAuthEndpoint = 
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN) ||
      endpoint?.includes(AUTH_ENDPOINTS.SIGNUP) ||
      endpoint?.includes(AUTH_ENDPOINTS.LOGIN_2FA) ||
      endpoint?.includes(AUTH_ENDPOINTS.REFRESH) ||
      endpoint?.includes('/auth/oauth2') ||
      endpoint?.includes(AUTH_ENDPOINTS.FORGOT_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESET_PASSWORD) ||
      endpoint?.includes(AUTH_ENDPOINTS.VALIDATE_RESET_TOKEN) ||
      endpoint?.includes(AUTH_ENDPOINTS.VERIFY_EMAIL) ||
      endpoint?.includes(AUTH_ENDPOINTS.RESEND_VERIFICATION);

    // Check if token expired
    // Only refresh if:
    // 1. Error code is TOKEN_EXPIRED (ERR_2002), OR
    // 2. 401 status on non-auth endpoints (likely token expired)
    // Do NOT refresh for INVALID_CREDENTIALS (ERR_2001) or AUTH_FAILED (ERR_2000)
    const isTokenExpired = 
      !isAuthEndpoint && // Never refresh for auth endpoints
      !originalRequest?._retry && // Prevent infinite retry loops
      (
        apiError?.errorCode === 'ERR_2002' || // TOKEN_EXPIRED
        (error.response?.status === 401 && 
         apiError?.errorCode !== 'ERR_2001' && // INVALID_CREDENTIALS
         apiError?.errorCode !== 'ERR_2000')   // AUTH_FAILED
      );

    if (isTokenExpired && originalRequest) {
      originalRequest._retry = true;

      try {
        // Use the shared refresh pipeline to avoid duplicate requests
        const { accessToken } = await refreshAuthSession();

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Only a terminal failure (refresh token missing/revoked/expired) means the
        // session is actually dead — a network blip or 5xx should not log the user out.
        if (isTerminalRefreshFailure(refreshError)) {
          clearStoredAuth();
          // Dispatch a custom event so the auth store can do a client-side redirect
          // (avoids a full page reload that would re-run addInitScript in E2E tests)
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
        }

        // Normalize before rejecting: every other exit from this interceptor hands back an
        // ApiError, and callers are typed for it (`err.errorCode`, `err.message`). The
        // refresh is an internal detail they never issued, so its AxiosError / ZodError /
        // StaleAuthSessionError must not surface in its place.
        //
        // Report the REFRESH failure, not the original 401 — the 401 was expected and would
        // have been handled; the refresh is why the request ultimately failed. This also
        // keeps the status honest for retry policy: a terminal ERR_2004 carries 403 (not
        // retriable), while a network blip carries 0, so TanStack Query can retry it
        // instead of writing it off as a client error. Never an internal exception string.
        throw (
          parseApiError(refreshError) ??
          synthesizeApiError(
            'Unable to refresh your session. Please try again.',
            (refreshError as AxiosError)?.response?.status ?? 0
          )
        );
      }
    }

    // Throw the validated error or fallback error
    if (apiError) {
      throw apiError;
    }

    // Fallback error
    throw synthesizeApiError(error.message || 'Network error', error.response?.status || 0);
  }
);