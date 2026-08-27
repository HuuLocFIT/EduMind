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
import { useCartStore } from "./cart.store";

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

/**
 * Data scoped to a specific identity, reset whenever a reconcile discovers a different one
 * (or rejects it outright): server-state cache and the locally-persisted cart. Cart reset is
 * a pure local set() (`clearCart`) — never a CART_ENDPOINTS call, since that would be a
 * business request made in the name of the identity we're in the middle of rejecting/replacing.
 */
function resetDataForIdentity() {
  queryClient.clear();
  useCartStore.getState().clearCart();
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
  // 'retry' means the very first boot probe hit a temporary failure (network/5xx/malformed).
  // It is only a lifecycle marker — what decides whether the shell may render a snapshot is
  // hasUnconfirmedSession(), which treats a boot failure and a later foreground-reconcile
  // failure the same way. See its comment below.
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
    (set, get) => {
      /**
       * The single transition for "the server confirmed an identity this portal must not
       * adopt", shared by all five paths that can discover one (login, 2FA, OAuth, foreground
       * refresh, boot probe). One function on purpose: while each path cleaned up on its own,
       * they drifted — login/2FA left the previous user, token and `isAuthenticated` in place,
       * OAuth cleared memory but not the cart or query cache, and the boot probe cleared
       * storage but not identity-scoped data. A mismatch reached through any of them must
       * leave exactly the same thing behind: no local snapshot, no data belonging to the old
       * identity, and the shared refresh cookie untouched (invariant #2 — clearing it would
       * kick the rightful user out of the OTHER portal).
       */
      const applyPortalRejection = (extra?: Partial<AuthState>) => {
        clearStoredAuth();
        resetDataForIdentity();
        // Sentry's scope is global and sticky: without this, every error raised afterwards —
        // on the mismatch page itself, and through the whole switch-account flow — keeps being
        // attributed to the identity that was just dropped, which is precisely the telemetry
        // needed to debug this class of bug. The admin portal already clears it in
        // clearAuthData(); this is the user portal's matching half.
        setSentryUser(null);
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          sessionRefreshError: 'PORTAL_MISMATCH',
          // Any completed transition closes out a switch-account escape attempt — including
          // this one, which sends the tab straight back to the mismatch page rather than
          // leaving the login form up with a confusing "invalid credentials"-style error.
          isSwitchingAccount: false,
          ...extra,
        });
      };

      return {
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

          // set() below is the only persistence: the store's persist middleware writes the
          // whole snapshot into 'auth-storage' — no separate raw-key write to keep in sync.
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
            // A real identity, just not one this portal accepts.
            applyPortalRejection({ isLoading: false });
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
            applyPortalRejection({ isLoading: false });
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
            applyPortalRejection({ isLoading: false });
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
          clearStoredAuth();
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
        clearStoredAuth();
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
        // Captured before the probe: the only way to tell "reconcile confirmed the same
        // identity" from "reconcile discovered a different one" (e.g. another tab/portal
        // logged in as someone else on the shared cookie) once the new user is in state.
        const previousUserId = get().user?.id ?? null;
        set({ isRefreshingSession: true, sessionRefreshError: null });
        try {
          // The 'auth:user-refreshed' listener below updates user/accessToken synchronously.
          await refreshAuthSession();
          // Set here rather than in that listener: the listener also runs for every
          // interceptor-driven refresh, where confirming the identity isn't its job and there
          // is no previousUserId to compare against. A reconcile can find a session where this
          // tab thought there was none (another tab or portal logged in on the shared cookie),
          // so this is a full transition to authenticated, not just a token swap — without it
          // the store ends up with a non-null user and isAuthenticated === false.
          set({ isAuthenticated: true });
          if ((get().user?.id ?? null) !== previousUserId) {
            resetDataForIdentity();
          }
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
            // local snapshot (in-memory too, not just storage — a stale user object must
            // never keep rendering as authenticated) but leave the shared cookie alone, and
            // don't paint this as "session expired" (auth:session-expired is for
            // SESSION_EXPIRED only).
            applyPortalRejection();
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
          // sessionRefreshError is cleared too: this is also the retry path out of a
          // 'TEMPORARY' failure, and leaving the flag set would keep the shell on the retry
          // screen forever even though the probe just succeeded.
          set({ isAuthenticated: true, authBootStatus: 'ready', sessionRefreshError: null });
        } catch (error) {
          if (isStaleAuthSessionError(error)) {
            // A login/logout landed while this was in flight; that transition owns the
            // store's state now. Boot is still "done" — there is nothing left to reconcile.
            set({ authBootStatus: 'ready' });
            return;
          }
          if (isPortalIdentityRejectedError(error)) {
            applyPortalRejection({ authBootStatus: 'ready' });
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
      };
    },
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

/**
 * True when a probe failed for a reason that proves nothing (network blip, timeout, 5xx,
 * malformed response) AND there is a local snapshot it failed to confirm. Both halves matter:
 *
 * - The snapshot half is what makes it unsafe — an unconfirmed identity must not be rendered
 *   as authenticated or be allowed to issue business requests (invariants #4 and #7), whether
 *   the failure came from the boot probe or from a later foreground reconcile. A confirmed
 *   session can stop being the right one at any moment: the refresh cookie is shared with the
 *   admin portal, so "it was fine when this page loaded" is not evidence about now.
 * - The absence of a snapshot is what makes it harmless — a guest has no identity to leak, so
 *   a failed probe there must not replace the public site with a retry screen (that would also
 *   break prerendering and LCP for every visitor whenever the API hiccups).
 */
export const hasUnconfirmedSession = (state: AuthState): boolean =>
  state.sessionRefreshError === 'TEMPORARY' && (state.isAuthenticated || state.user !== null);

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

  // Cross-tab sync within this app: another tab logging in, logging out, or discovering a
  // different identity via reconcile writes 'auth-storage' (the Zustand persist key), and
  // every other tab should reflect it instead of keeping a stale in-memory snapshot. Browsers
  // never fire 'storage' on the tab that made the write, only on other tabs, so this can't
  // loop back on itself. NOT used for admin<->user sync - those are different origins
  // (edumind.* vs admin.edumind.*, or :3000 vs :4200 in dev) and never receive each other's
  // storage events; that direction is handled entirely by server reconcile.
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== 'auth-storage') return;
    // A tab that has deliberately paused reconciliation (mismatch or switch-account in
    // progress) must not have its local state silently overwritten out from under it.
    const { sessionRefreshError, isSwitchingAccount } = useAuthStore.getState();
    if (isSwitchingAccount || sessionRefreshError === 'PORTAL_MISMATCH') return;

    const previousUserId = useAuthStore.getState().user?.id ?? null;
    let next: { user: User | null; accessToken: string | null; isAuthenticated: boolean };
    if (!event.newValue) {
      next = { user: null, accessToken: null, isAuthenticated: false };
    } else {
      try {
        const parsed = JSON.parse(event.newValue);
        next = {
          user: parsed?.state?.user ?? null,
          accessToken: parsed?.state?.accessToken ?? null,
          isAuthenticated: !!parsed?.state?.isAuthenticated,
        };
      } catch {
        return; // Malformed write from another tab — ignore rather than adopt garbage.
      }
    }

    useAuthStore.setState(next);
    if ((next.user?.id ?? null) !== previousUserId) {
      resetDataForIdentity();
    }
    setSentryUser(next.user);
  });
}
