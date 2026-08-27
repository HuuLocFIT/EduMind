import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as Sentry from '@sentry/react';
import type {
  User,
  LoginRequest,
  SignupRequest,
  TwoFactorLoginRequest,
  JwtResponse,
} from "@edumind/shared-types";
import { authService } from '../services/auth.service';
import {
  refreshAuthSession,
  isTerminalRefreshFailure,
  isStaleAuthSessionError,
  isPortalIdentityRejectedError,
  invalidateAuthSession,
  clearStoredAuth,
  validateUserPortalIdentity,
  fetchCurrentUserWith,
} from '../services/api-client.service';
import { queryClient } from "../lib/query-client";

// Attempt flags for the two independent role-sync triggers (post-approval sync in
// MainLayout, direct-bookmark sync in TeacherGuard). Module-level (not component state):
// TeacherGuard remounts on every navigate, which would reset a useRef/useState flag and
// loop refresh<->redirect forever. Two separate keys because they dedupe on different
// identities (user.id vs application.id) — a single shared flag would let a guard
// attempt suppress the sync that must run right after an application gets approved.
let guardAttemptedUserId: number | null = null;
let approvedAttemptedApplicationId: number | null = null;

export const hasGuardAttempted = (userId?: number) =>
  userId != null && guardAttemptedUserId === userId;
export const markGuardAttempted = (userId: number) => {
  guardAttemptedUserId = userId;
};

export const hasApprovalAttempted = (applicationId?: number) =>
  applicationId != null && approvedAttemptedApplicationId === applicationId;
export const markApprovalAttempted = (applicationId: number) => {
  approvedAttemptedApplicationId = applicationId;
};

export const resetRoleSyncAttempts = () => {
  guardAttemptedUserId = null;
  approvedAttemptedApplicationId = null;
};

/**
 * Everything that must be reset when the identity behind the session changes (login,
 * logout, forced clear): the role-sync attempt flags, plus the api-client's session
 * generation so a refresh still in flight can't write back into the new session.
 */
function resetAuthSessionIdentity() {
  invalidateAuthSession();
  resetRoleSyncAttempts();
}

// Refresh mechanics belonging to the previous session. Reset when an auth attempt STARTS,
// not only when it succeeds: resetAuthSessionIdentity() makes the refresh in flight stale,
// and a stale refresh deliberately leaves isRefreshingSession alone (see refreshSession) —
// so a login that then FAILS would leave the flag stuck on, with TeacherGuard showing
// "Verifying access…" and the approved CTA disabled forever.
//
// Invariant: every caller of resetAuthSessionIdentity() must also apply this in the same
// tick. That is what makes the stale-refresh early return safe.
const REFRESH_STATE_RESET = {
  isRefreshingSession: false,
  sessionRefreshError: null,
} satisfies Partial<AuthState>;

// The above plus the login-page banner reason, which only a COMPLETED auth transition
// retires — a failed login attempt leaves "your session expired" true and still worth
// showing. None of it is persisted, so it only leaks across an in-memory logout → login
// (no reload) — but there it leaks for good when nothing triggers another refresh: a
// leftover 'SESSION_EXPIRED' hides the approved-application CTA and bounces TeacherGuard
// to /login for a user who just signed in successfully.
// isSwitchingAccount rides along with it: any completed transition (successful login, logout,
// a fresh portal rejection) closes out the escape attempt, whether it used it or not.
const SESSION_SCOPED_RESET = {
  ...REFRESH_STATE_RESET,
  sessionExpiredReason: null,
  isSwitchingAccount: false,
} satisfies Partial<AuthState>;

// Helper to avoid duplicating Sentry user context across 3 login paths
function setSentryUser(user: { id: string | number; role?: string; roles?: string[] } | null) {
  if (user) {
    Sentry.setUser({
      id: String(user.id),
      // Do NOT send email — PII
      // id is enough to look up in the dashboard
      username: `user-${user.id}`,
      // Include role to filter errors by user type (STUDENT / TEACHER)
      role: user.role ?? user.roles?.[0],
    });
  } else {
    Sentry.setUser(null);
  }
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isRefreshingSession: boolean;
  sessionRefreshError: 'SESSION_EXPIRED' | 'TEMPORARY' | 'PORTAL_MISMATCH' | null;
  // Read by LoginPage to show a "session expired" banner. NOT persisted — see partialize below.
  sessionExpiredReason: 'SESSION_EXPIRED' | null;
  // Lifecycle of the mandatory boot probe (bootstrapAuthSession). NOT persisted — every page
  // load must re-probe /auth/refresh regardless of what the last session left in storage.
  // 'retry' means the very first boot probe hit a temporary failure (network/5xx/malformed):
  // nothing about the local snapshot is confirmed yet, so the app shell must show a retry
  // screen instead of trusting it — distinct from a TEMPORARY failure during a later
  // foreground reconcile (TeacherGuard's refreshSession), which keeps rendering normally.
  authBootStatus: 'idle' | 'checking' | 'ready' | 'retry';
  // The escape hatch out of a portalMismatch dead end: while true, the app shell renders the
  // login route instead of the mismatch page, and reconciliation stays paused. NOT persisted —
  // it only makes sense for the tab that clicked "log in with a different account". Cleared by
  // any completed auth transition (successful login, logout, another portal rejection).
  isSwitchingAccount: boolean;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  loginWith2FA: (credentials: TwoFactorLoginRequest) => Promise<void>;
  loginWithOAuth2: (token: string) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  clearAuthState: () => void;
  refreshSession: () => Promise<void>;
  clearSessionExpiredReason: () => void;
  bootstrapAuthSession: () => Promise<void>;
  startSwitchingAccount: () => void;
  cancelSwitchingAccount: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isRefreshingSession: false,
      sessionRefreshError: null,
      sessionExpiredReason: null,
      authBootStatus: 'idle',
      isSwitchingAccount: false,

      login: async (credentials) => {
        // Before the first await, not after it: submitting credentials for somebody is the
        // moment the previous session stops owning the store. A refresh that lands while
        // the login request is on the wire would otherwise still be treated as current and
        // write the old token back into localStorage. Cost of invalidating this early: if
        // the login fails, the previous session's in-flight refresh is discarded — the next
        // 401 simply starts a new one.
        resetAuthSessionIdentity();
        set({ isLoading: true, error: null, ...REFRESH_STATE_RESET });
        try {
          const response = await authService.login(credentials);

          // Check if 2FA is required
          if (
            response &&
            typeof response === "object" &&
            "requires2FA" in response &&
            (response as any).requires2FA === true
          ) {
            // This is a TwoFactorRequiredResponse, throw a special error
            const error = new Error(
              (response as any).message || "Two-factor authentication required"
            );
            (error as any).requires2FA = true;
            (error as any).email = (response as any).email;
            set({ isLoading: false });
            throw error;
          }

          // Normal login response
          const jwtResponse = response as JwtResponse;
          validateUserPortalIdentity(jwtResponse.user);

          // Save tokens (only after validation — an admin identity must never be persisted)
          localStorage.setItem("accessToken", jwtResponse.accessToken);
          localStorage.setItem("user", JSON.stringify(jwtResponse.user));

          set({
            user: jwtResponse.user,
            accessToken: jwtResponse.accessToken,
            isAuthenticated: true,
            isLoading: false,
            ...SESSION_SCOPED_RESET,
          });
          setSentryUser(jwtResponse.user);
        } catch (error: any) {
          // If it's a 2FA required error, re-throw it
          if (error.requires2FA) {
            throw error;
          }
          if (isPortalIdentityRejectedError(error)) {
            // A real identity, just not one this portal accepts. If this attempt came from the
            // switchingAccount escape hatch, send it right back to the mismatch page instead of
            // leaving the login form to show a confusing "invalid credentials"-style error.
            set({ isLoading: false, sessionRefreshError: 'PORTAL_MISMATCH', isSwitchingAccount: false });
            throw error;
          }
          const errorMessage =
            error.response?.data?.message || error.message || "Login failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loginWith2FA: async (credentials) => {
        // Before the first await — see login().
        resetAuthSessionIdentity();
        set({ isLoading: true, error: null, ...REFRESH_STATE_RESET });
        try {
          const response = await authService.loginWith2FA(credentials);
          // Candidate token passed directly — never written to localStorage before validation.
          const user = await fetchCurrentUserWith(response.accessToken);
          validateUserPortalIdentity(user);

          localStorage.setItem("accessToken", response.accessToken);
          localStorage.setItem("user", JSON.stringify(user));

          set({
            user: user,
            accessToken: response.accessToken,
            isAuthenticated: true,
            isLoading: false,
            ...SESSION_SCOPED_RESET,
          });
          setSentryUser(user);
        } catch (error: any) {
          if (isPortalIdentityRejectedError(error)) {
            set({ isLoading: false, sessionRefreshError: 'PORTAL_MISMATCH', isSwitchingAccount: false });
            throw error;
          }
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "2FA verification failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loginWithOAuth2: async (token) => {
        // Before the first await — see login().
        resetAuthSessionIdentity();
        set({ isLoading: true, error: null, ...REFRESH_STATE_RESET });
        try {
          // Candidate token passed directly — never written to localStorage before validation.
          const user = await fetchCurrentUserWith(token);
          validateUserPortalIdentity(user);

          localStorage.setItem("accessToken", token);
          localStorage.setItem("user", JSON.stringify(user));

          set({
            user,
            accessToken: token,
            isAuthenticated: true,
            isLoading: false,
            ...SESSION_SCOPED_RESET,
          });
          setSentryUser(user);
        } catch (error: any) {
          if (isPortalIdentityRejectedError(error)) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isLoading: false,
              sessionRefreshError: 'PORTAL_MISMATCH',
              isSwitchingAccount: false,
            });
            throw error;
          }
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || "OAuth2 login failed",
          });

          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "OAuth2 login failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.signup(data);

          set({ isLoading: false });
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message || error.message || "Signup failed";
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        // Before the API call, not in the finally: a slow or hanging logout request would
        // otherwise leave a whole round-trip during which an in-flight refresh still counts
        // as current and writes the access token back into localStorage.
        resetAuthSessionIdentity();
        set({ isLoading: true, ...REFRESH_STATE_RESET });
        try {
          await authService.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          // Clear all auth data
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          // Clear React Query cache to avoid showing stale user data after logout
          queryClient.clear();
          // Again after the request: authService.logout() goes through apiClient, so a 401
          // on it can start a brand-new refresh under the generation set above.
          resetAuthSessionIdentity();

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            ...SESSION_SCOPED_RESET,
          });
          setSentryUser(null);
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user }),

      // Clear auth state without calling API (useful for account deletion)
      clearAuthState: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        queryClient.clear();
        resetAuthSessionIdentity();
        setSentryUser(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          ...SESSION_SCOPED_RESET,
        });
      },

      refreshSession: async () => {
        let stale = false;
        set({ isRefreshingSession: true, sessionRefreshError: null });
        try {
          // The 'auth:user-refreshed' listener below updates user/accessToken synchronously.
          await refreshAuthSession();
        } catch (error) {
          if (isStaleAuthSessionError(error)) {
            // Logout or another login happened while this was in flight. The session that
            // asked for the refresh is gone, so there is nobody to report an error to —
            // surfacing one here would paint the NEW session with the old one's failure.
            stale = true;
            return;
          }
          if (isPortalIdentityRejectedError(error)) {
            // Not a dead session — a real identity the user portal must not adopt. Clear the
            // local snapshot but leave the shared cookie alone, and don't paint this as
            // "session expired" (auth:session-expired is for SESSION_EXPIRED only).
            clearStoredAuth();
            set({ sessionRefreshError: 'PORTAL_MISMATCH' });
          } else if (isTerminalRefreshFailure(error)) {
            clearStoredAuth();
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
            set({ sessionRefreshError: 'SESSION_EXPIRED' });
          } else {
            // Keep the session — retry is possible (network blip, timeout, 5xx, malformed response)
            set({ sessionRefreshError: 'TEMPORARY' });
          }
        } finally {
          // A stale refresh must not clear the flag — the session that owns the store now
          // may have a refresh of its own in flight. Safe to skip only because every
          // boundary that can make a refresh stale applies REFRESH_STATE_RESET itself.
          if (!stale) {
            set({ isRefreshingSession: false });
          }
        }
      },

      clearSessionExpiredReason: () => set({ sessionExpiredReason: null }),

      bootstrapAuthSession: async () => {
        // Guards the automatic mount-time call (StrictMode double-invoke, or a rerender
        // firing the same effect) — a caller retrying after 'retry' still goes through.
        if (get().authBootStatus === 'checking') return;

        // Not read from the persisted snapshot alone: the whole point of this probe is that
        // the snapshot might be lying (portal mismatch already cleared it, or it says
        // authenticated for a cookie that's since been revoked). Captured before the probe
        // so a terminal failure can tell "a real session just ended" from "no cookie, never
        // was one" — only the former is worth an "your session expired" banner.
        const wasAuthenticated = get().isAuthenticated;
        set({ authBootStatus: 'checking' });

        try {
          await refreshAuthSession();
          // 'auth:user-refreshed' (dispatched synchronously inside refreshAuthSession) has
          // already written user/accessToken — this just confirms the identity as current.
          set({ isAuthenticated: true, authBootStatus: 'ready' });
        } catch (error) {
          if (isStaleAuthSessionError(error)) {
            // A login/logout landed while this was in flight; that transition owns the
            // store's state now. Boot is still "done" — there is nothing left to reconcile.
            set({ authBootStatus: 'ready' });
            return;
          }
          if (isPortalIdentityRejectedError(error)) {
            clearStoredAuth();
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
              sessionRefreshError: 'PORTAL_MISMATCH',
              authBootStatus: 'ready',
            });
            return;
          }
          if (isTerminalRefreshFailure(error)) {
            clearStoredAuth();
            set({ user: null, accessToken: null, isAuthenticated: false, authBootStatus: 'ready' });
            if (wasAuthenticated) {
              window.dispatchEvent(new CustomEvent('auth:session-expired'));
            }
            return;
          }
          // Network blip / timeout / 5xx / malformed response: nothing about the snapshot is
          // confirmed. Leave it untouched (invariant #4) and let the shell show a retry UI
          // rather than render it as authenticated.
          set({ sessionRefreshError: 'TEMPORARY', authBootStatus: 'retry' });
        }
      },

      startSwitchingAccount: () => set({ isSwitchingAccount: true }),

      // Only the escape attempt ends — sessionRefreshError stays 'PORTAL_MISMATCH' so the app
      // shell falls back to the mismatch page rather than something ambiguous.
      cancelSwitchingAccount: () => set({ isSwitchingAccount: false }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listen for session-expiry events dispatched by the API client when token refresh fails.
// Using a custom event avoids a circular import (api-client → auth.store → auth.service → api-client).
// Calling clearAuthState() here triggers a client-side React Router redirect via ProtectedRoute,
// so there is no full page reload that would re-run E2E addInitScript hooks.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:session-expired', () => {
    useAuthStore.getState().clearAuthState();
    // Set AFTER clearAuthState: clearAuthState resets state, so setting before it
    // would be wiped out. LoginPage reads this to show a "session expired" banner —
    // route state can't carry it (ProtectedRoute/interceptor don't have a route to attach it to).
    useAuthStore.setState({ sessionExpiredReason: 'SESSION_EXPIRED' });
  });

  // Dispatched synchronously by refreshAuthSession() once the new access token + user
  // are persisted to localStorage — only set(), never write 'auth-storage' directly here.
  // The persist middleware writes it from partialize on every set() call; writing it by
  // hand as well would race the middleware and leave the two out of sync.
  window.addEventListener('auth:user-refreshed', (event) => {
    const { user, accessToken } = (event as CustomEvent).detail;
    useAuthStore.setState({ user, accessToken });
    setSentryUser(user);
  });
}
