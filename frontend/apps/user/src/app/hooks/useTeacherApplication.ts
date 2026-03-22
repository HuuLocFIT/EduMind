import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/auth.store";
import { teacherApplicationService } from "../services/teacher-application.service";
import { queryKeys } from "../lib/query-keys";
import { UserRole } from "@edumind/shared-constants";

export const useTeacherApplication = () => {
  const { user, isAuthenticated } = useAuthStore();
  const isStudent = user?.roles.includes(UserRole.STUDENT);

  return useQuery({
    queryKey: queryKeys.teacherApplication.myApplication(user?.id),
    queryFn: async () => {
      try {
        return await teacherApplicationService.getMyApplication();
      } catch (error: any) {
        if (error.response?.status === 404 || error.status === 404) return null;
        throw error;
      }
    },
    enabled: Boolean(isStudent && isAuthenticated && user?.id),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404 || error?.status === 404) return false;
      return failureCount < 2;
    },
  });
};
