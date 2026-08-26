import { useEffect } from "react";
import { UserRole } from "@edumind/shared-constants";
import { useAuthStore, hasApprovalAttempted, markApprovalAttempted } from "../stores/auth.store";

interface UseTeacherRoleSyncParams {
  applicationId?: number;
  status?: string | null;
}

/**
 * Syncs the auth store's role snapshot after a teacher application is approved.
 * Approval grants ROLE_TEACHER/ROLE_TEACHER_TRIAL server-side immediately, but the
 * store's `user.roles` is a snapshot taken at login — without this, the UI keeps
 * showing student-only access until the user logs out and back in.
 *
 * Takes explicit input instead of calling useTeacherApplicationStatus() itself so the
 * caller (MainLayout) can share its own query instance rather than creating a second one.
 */
export function useTeacherRoleSync({ applicationId, status }: UseTeacherRoleSyncParams) {
  const { user, refreshSession, isRefreshingSession, sessionRefreshError } = useAuthStore();

  const hasTeacherRole =
    user?.roles?.some((role) => role === UserRole.TEACHER || role === UserRole.TEACHER_TRIAL) ??
    false;

  const needsSync =
    status === "APPROVED" &&
    applicationId != null &&
    !hasTeacherRole &&
    !hasApprovalAttempted(applicationId);

  useEffect(() => {
    if (!needsSync || applicationId == null) return;
    // Re-read the flag instead of trusting the captured `needsSync`: this hook is mounted
    // twice at once (MainLayout and, below it, ApplicationStatusPage), both compute
    // needsSync=true in the same render pass, and effects run child-first — so without
    // this check the parent's effect fires a second refreshSession() off a value the
    // child has already invalidated. Same guard covers StrictMode's double-invoke.
    if (hasApprovalAttempted(applicationId)) return;
    // Mark BEFORE awaiting — prevents a double-fire if the application query refetches
    // while the refresh is still in flight.
    markApprovalAttempted(applicationId);
    void refreshSession();
  }, [needsSync, applicationId, refreshSession]);

  return { hasTeacherRole, isRefreshingSession, sessionRefreshError, needsSync };
}
