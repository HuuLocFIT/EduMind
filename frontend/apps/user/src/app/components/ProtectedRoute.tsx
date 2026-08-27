import { Navigate, Outlet, useLocation } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useAuthStore } from "../stores/auth.store";
import { FullPageLoading } from "@edumind/user-ui";

/**
 * ProtectedRoute - Protects routes that require authentication
 * 
 * Uses Zustand auth store for proper state sync instead of direct localStorage check.
 * This ensures consistent auth state across the app and handles token expiry properly.
 */
export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, isLoading, authBootStatus } = useAuthStore();

  // Show loading while checking auth state (during rehydration)
  if (isLoading) {
    return <FullPageLoading message="Checking authentication..." />;
  }

  // The persisted snapshot is a hint, not proof — the mandatory boot probe (see
  // bootstrapAuthSession) is still confirming it against the shared cookie. Only wait when
  // the snapshot says unauthenticated: a snapshot that already says authenticated can render
  // immediately, and the boot probe will unwind it via portalMismatch/session-expired if it
  // turns out to be wrong. Waiting unconditionally here would flash a loading screen on every
  // reload for the common case (a real, still-valid session).
  if (!isAuthenticated && authBootStatus !== 'ready') {
    return <FullPageLoading message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    // Redirect to login but save the attempted location
    return (
      <Navigate to={USER_ROUTES.LOGIN} state={{ from: location }} replace />
    );
  }

  return <Outlet />;
};
