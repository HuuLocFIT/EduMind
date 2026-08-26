import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import { teacherApplicationService } from "../services/teacher-application.service";
import { queryKeys } from "../lib/query-keys";
import { UserRole } from "@edumind/shared-constants";

const isNotFoundError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: number; response?: { status?: number } };
  return candidate.status === 404 || candidate.response?.status === 404;
};

export const useTeacherApplication = () => {
  const { user, isAuthenticated } = useAuthStore();
  const isStudent = user?.roles.includes(UserRole.STUDENT);
  const isTeacher =
    user?.roles.includes(UserRole.TEACHER) ||
    user?.roles.includes(UserRole.TEACHER_TRIAL);

  return useQuery({
    queryKey: queryKeys.teacherApplication.myApplication(user?.id),
    queryFn: async () => {
      try {
        return await teacherApplicationService.getMyApplication();
      } catch (error: unknown) {
        if (isNotFoundError(error)) return null;
        throw error;
      }
    },
    enabled: Boolean(isAuthenticated && user?.id && (isStudent || isTeacher)),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: unknown) => {
      if (isNotFoundError(error)) return false;
      return failureCount < 2;
    },
  });
};

export const useTeacherApplicationStatus = () => {
  const query = useTeacherApplication();
  const application = query.data ?? null;
  const status = application?.status ?? null;
  return {
    ...query,
    application,
    status,
    hasApplication: application !== null,
    canApply: application === null || status === "REJECTED",
    isRejected: status === "REJECTED",
  };
};
