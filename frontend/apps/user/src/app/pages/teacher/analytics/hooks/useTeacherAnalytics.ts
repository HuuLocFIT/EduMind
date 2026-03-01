import { useQuery } from "@tanstack/react-query";
import { teacherAnalyticsService } from "../../../../services/teacher-analytics.service";

export function useTeacherAnalytics() {
  return useQuery({
    queryKey: ["teacher-analytics"],
    queryFn: () => teacherAnalyticsService.getAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
