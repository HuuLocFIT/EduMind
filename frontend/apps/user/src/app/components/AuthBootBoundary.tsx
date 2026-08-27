import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useAuthStore } from "../stores/auth.store";

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

/**
 * App-shell boundary above all route content (public and protected alike) — not a route
 * guard. Never blocks LCP: while the probe is still running ('idle'/'checking'), route
 * content renders immediately and auth-dependent controls stay neutral via useAuthUiReady.
 * Only a definitive bad outcome replaces route content:
 * - 'retry': the very first probe failed for an unconfirmed reason (network/5xx/malformed) —
 *   nothing about the local snapshot is trustworthy yet, so there is nothing safe to render.
 * - PORTAL_MISMATCH: a confirmed identity that does not belong on this portal. The URL is
 *   left untouched (no <Navigate>, no route change) — see fix_multiple_account_on_browser_profile.md.
 */
export function AuthBootBoundary({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  const authBootStatus = useAuthStore((state) => state.authBootStatus);
  const sessionRefreshError = useAuthStore((state) => state.sessionRefreshError);
  const isSwitchingAccount = useAuthStore((state) => state.isSwitchingAccount);
  const navigate = useNavigate();
  const location = useLocation();

  if (authBootStatus === "retry") {
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-700">
          We couldn't verify your session. Check your connection and try again.
        </p>
        <button
          type="button"
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
    return (
      <div role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-gray-700">
          This account isn't available on this portal.
        </p>
        <button
          type="button"
          onClick={() => {
            useAuthStore.getState().startSwitchingAccount();
            navigate(USER_ROUTES.LOGIN, { state: { from: location } });
          }}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Log in with a different account
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
