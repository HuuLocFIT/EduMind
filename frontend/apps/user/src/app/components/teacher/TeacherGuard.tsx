import { Navigate, Outlet, useLocation } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";
import { UserRole } from "@edumind/shared-constants";
import { useAuthStore } from "../../stores/auth.store";
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
 */
export const TeacherGuard: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  // Show loading while checking auth state
  if (isLoading) {
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

  // Check if user has teacher role
  const isTeacher = user.roles?.includes(UserRole.TEACHER);
  const isTrialTeacher = user.roles?.includes(UserRole.TEACHER_TRIAL);
  const hasTeacherAccess = isTeacher || isTrialTeacher;

  // Redirect to dashboard if not a teacher
  if (!hasTeacherAccess) {
    return <Navigate to={USER_ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
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
