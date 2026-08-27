import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";
import { UserRole } from "@edumind/shared-constants";
import { useAuthStore, hasGuardAttempted, markGuardAttempted } from "../../stores/auth.store";
import { FullPageLoading } from "@edumind/user-ui";

/**
 * TeacherGuard - Protects teacher portal routes
 *
 * Checks if user:
 * 1. Is authenticated
 * 2. Has TEACHER or TEACHER_TRIAL role
 *
 * Redirects to:
 * - Login page if not authenticated
 * - Dashboard if authenticated but not a teacher
 *
 * Covers the direct-bookmark case: a user whose DB role was granted (e.g. application
 * just approved) but whose auth store still holds a stale pre-approval role snapshot.
 * That case never produces a 401 (the access token is still valid), so the reactive
 * refresh pipeline in api-client.service.ts never fires on its own — this guard
 * proactively syncs once before deciding to redirect away.
 */
export const TeacherGuard: React.FC = () => {
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading,
    refreshSession,
    isRefreshingSession,
    sessionRefreshError,
    authBootStatus,
  } = useAuthStore();

  const isTeacher = user?.roles?.includes(UserRole.TEACHER);
  const isTrialTeacher = user?.roles?.includes(UserRole.TEACHER_TRIAL);
  const hasTeacherAccess = Boolean(isTeacher || isTrialTeacher);

  const needsGuardSync =
    isAuthenticated && !!user && !hasTeacherAccess && !hasGuardAttempted(user.id);

  // Trigger lives in an effect, not render — mark+refreshSession during render would be
  // a side effect in render (React warning, unpredictable rerenders, double-run under
  // StrictMode).
  useEffect(() => {
    if (!needsGuardSync || !user) return;
    // Re-read rather than trust the captured `needsGuardSync` — StrictMode invokes this
    // effect twice on mount with the same deps.
    if (hasGuardAttempted(user.id)) return;
    markGuardAttempted(user.id);
    void refreshSession();
  }, [needsGuardSync, refreshSession, user?.id]);

  // Show loading while checking auth state
  if (isLoading) {
    return <FullPageLoading message="Loading..." />;
  }

  // The persisted snapshot is a hint, not proof — see ProtectedRoute for the same guard and
  // its rationale. Only wait when the snapshot says unauthenticated; an already-authenticated
  // snapshot renders immediately and gets unwound by the boot probe if it turns out wrong.
  if (!isAuthenticated && authBootStatus !== 'ready') {
    return <FullPageLoading message="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={USER_ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  // Already has access — let the route through immediately.
  if (hasTeacherAccess) {
    return <Outlet />;
  }

  // Sync in flight: needsGuardSync must render loading BEFORE the effect above runs,
  // otherwise the first frame redirects and unmounts this guard before refresh starts.
  if (needsGuardSync || isRefreshingSession) {
    return <FullPageLoading message="Verifying access…" />;
  }

  if (sessionRefreshError === 'SESSION_EXPIRED') {
    // Reason already lives in the auth store (sessionExpiredReason) — no need for route state.
    return <Navigate to={USER_ROUTES.LOGIN} replace />;
  }

  // Already attempted (or refresh failed temporarily) and still no teacher role.
  return (
    <Navigate
      to={USER_ROUTES.DASHBOARD}
      replace
      state={{ reason: 'TEACHER_ACCESS_UNAVAILABLE' }}
    />
  );
};

/**
 * Hook to check teacher status
 * Useful for conditional rendering in components
 */
export const useTeacherStatus = () => {
  const { user } = useAuthStore();
  
  const isTeacher = user?.roles?.includes(UserRole.TEACHER) ?? false;
  const isTrialTeacher = user?.roles?.includes(UserRole.TEACHER_TRIAL) ?? false;
  const hasTeacherAccess = isTeacher || isTrialTeacher;
  
  // Calculate trial days remaining if trial teacher
  let trialDaysRemaining: number | null = null;
  if (isTrialTeacher && user?.trialEndDate) {
    const endDate = new Date(user.trialEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    isTeacher,
    isTrialTeacher,
    hasTeacherAccess,
    trialDaysRemaining,
    isTrialExpired: trialDaysRemaining !== null && trialDaysRemaining <= 0,
  };
};
