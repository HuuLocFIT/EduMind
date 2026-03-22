import { Navigate, Outlet } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";
import { UserRole } from "@edumind/shared-constants";
import { useAuthStore } from "../stores/auth.store";
import { useTeacherApplication } from "../hooks";

const CheckingBlock = ({ label }: { label: string }) => (
  <div className="min-h-[200px] flex items-center justify-center text-sm text-gray-600">
    {label}
  </div>
);

/**
 * TeacherApplicationRoute - Guard for teacher application page
 *
 * Redirects to application status if user already has an application.
 * Uses shared useTeacherApplication hook to share cached data with MainLayout and other components.
 */
export const TeacherApplicationRoute = () => {
  const { user } = useAuthStore();
  const isStudent = user?.roles?.includes(UserRole.STUDENT);

  const { data: application, isLoading } = useTeacherApplication();

  // Redirect non-students
  if (!isStudent) {
    return <Navigate to={USER_ROUTES.ROOT} replace />;
  }

  // Show loading state
  if (isLoading) {
    return <CheckingBlock label="Checking your application..." />;
  }

  // Redirect if application exists
  if (application) {
    return <Navigate to={USER_ROUTES.TEACHER_APPLICATION_STATUS} replace />;
  }

  // No application - allow access to application form
  return <Outlet />;
};

/**
 * TeacherApplicationStatusRoute - Guard for application status page
 *
 * Redirects to application form if user doesn't have an application.
 * Uses shared useTeacherApplication hook to share cached data with MainLayout and other components.
 */
export const TeacherApplicationStatusRoute = () => {
  const { data: application, isLoading } = useTeacherApplication();

  // Show loading state
  if (isLoading) {
    return <CheckingBlock label="Loading status..." />;
  }

  // Redirect if no application exists
  if (!application) {
    return <Navigate to={USER_ROUTES.TEACHER_APPLICATION} replace />;
  }

  // Application exists - allow access to status page
  return <Outlet />;
};
