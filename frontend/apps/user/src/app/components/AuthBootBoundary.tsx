import { useEffect, type ReactNode } from "react";
import { useAuthStore, hasUnconfirmedSession } from "../stores/auth.store";
import { PortalMismatchPage } from "../pages/auth/PortalMismatchPage";

/**
 * Fires the mandatory boot probe once per page load. Guarded by `typeof window` so it never
 * runs outside a browser context (defensive — this app has no SSR today, but prerendering
 * runs inside real Puppeteer, where `window` exists). `bootstrapAuthSession` itself is
 * idempotent while a probe is in flight, so a StrictMode double-invoke of this effect is safe.
 */
function useAuthBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    void useAuthStore.getState().bootstrapAuthSession();
  }, []);
}

// Module-scope, not component state: the throttle must survive remounts of this boundary
// (route changes don't unmount the app shell, but StrictMode and tests do) and there is only
// ever one of these in the app. Exported reset is test-only — production code never calls it.
const FOREGROUND_RECONCILE_THROTTLE_MS = 60_000;
let lastForegroundReconcileAt = 0;

export function __resetForegroundReconcileThrottleForTests() {
  lastForegroundReconcileAt = 0;
}

/**
 * Re-probes /auth/refresh whenever the tab regains focus, throttled to once per
 * FOREGROUND_RECONCILE_THROTTLE_MS. Runs for both authenticated and unauthenticated
 * snapshots — a cookie set by another tab or portal can change either one — but stays off
 * during 'initializing' (the boot probe already owns that), portalMismatch, switchingAccount,
 * and while a probe is already in flight (refreshAuthSession's own promise cache dedupes
 * concurrent callers; this just avoids scheduling a redundant one). See
 * fix_multiple_account_on_browser_profile.md P1-5.
 */
function useForegroundReconcile() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const state = useAuthStore.getState();
      if (state.authBootStatus !== "ready") return;
      if (state.sessionRefreshError === "PORTAL_MISMATCH") return;
      if (state.isSwitchingAccount) return;
      if (state.isRefreshingSession) return;

      const now = Date.now();
      if (now - lastForegroundReconcileAt < FOREGROUND_RECONCILE_THROTTLE_MS) return;
      lastForegroundReconcileAt = now;

      void state.refreshSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
}

/**
 * App-shell boundary above all route content (public and protected alike) — not a route
 * guard. Never blocks LCP: while the probe is still running ('idle'/'checking'), route
 * content renders immediately and auth-dependent controls stay neutral via useAuthUiReady.
 * Only a definitive bad outcome replaces route content:
 * - hasUnconfirmedSession: a probe failed for an unconfirmed reason (network/5xx/malformed)
 *   while a local snapshot was waiting on it — nothing about that snapshot is trustworthy, so
 *   there is nothing safe to render. Applies to the boot probe and to every later foreground
 *   reconcile alike: the refresh cookie is shared with the admin portal, so an identity
 *   confirmed at page load can stop being the right one at any moment. A guest (no snapshot)
 *   is unaffected — public content keeps rendering through an API hiccup.
 * - PORTAL_MISMATCH: a confirmed identity that does not belong on this portal. The URL is
 *   left untouched (no <Navigate>, no route change) — see fix_multiple_account_on_browser_profile.md.
 */
export function AuthBootBoundary({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  useForegroundReconcile();
  const unconfirmedSession = useAuthStore(hasUnconfirmedSession);
  const sessionRefreshError = useAuthStore((state) => state.sessionRefreshError);
  const isSwitchingAccount = useAuthStore((state) => state.isSwitchingAccount);
  const isRefreshingSession = useAuthStore((state) => state.isRefreshingSession);

  if (unconfirmedSession) {
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-700">
          We couldn't verify your session. Check your connection and try again.
        </p>
        <button
          type="button"
          // bootstrapAuthSession, not refreshSession, for both the boot and the foreground
          // case: it always probes (it only skips while one is already 'checking') and its
          // success path is the one that confirms the identity and clears the TEMPORARY flag.
          onClick={() => void useAuthStore.getState().bootstrapAuthSession()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  // switchingAccount is the escape hatch out of the block above: it renders route content (the
  // login route) even though sessionRefreshError is still PORTAL_MISMATCH, so the login form can
  // mount. A successful login clears both fields via SESSION_SCOPED_RESET; a wrong-role login
  // attempt sets isSwitchingAccount back to false, which falls through to the mismatch notice
  // below on the next render. Local portal state was already cleared when PORTAL_MISMATCH was
  // first set — the shared cookie is untouched either way.
  if (sessionRefreshError === "PORTAL_MISMATCH" && !isSwitchingAccount) {
    return <PortalMismatchPage />;
  }

  return (
    <>
      {children}
      {isRefreshingSession && (
        // A foreground reconcile is in flight: keep the current layout mounted (no full-page
        // flash) but block auth-sensitive interaction (checkout, submit, update) until the
        // identity behind this tab is confirmed — an unconfirmed access token must never back
        // a new business request (fix_multiple_account_on_browser_profile.md invariant #7).
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-50 cursor-wait"
          style={{ pointerEvents: "auto" }}
        >
          <span className="sr-only">Syncing your session…</span>
        </div>
      )}
    </>
  );
}
