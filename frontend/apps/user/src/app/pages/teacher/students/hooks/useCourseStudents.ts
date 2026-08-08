import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { teacherCourseService } from '../../../../services/teacher-course.service';
import { queryKeys } from "../../../../lib/query-keys";
import { STALE_TIME_TEACHER_COURSES } from "../../../../lib/query-config";
import type { CoursePickerList } from "@edumind/shared-types";
import type { CourseStudentsPageState } from "../types/students.types";

interface UseCourseStudentsProps {
  userId?: number;
}

export const useCourseStudents = ({ userId }: UseCourseStudentsProps) => {
  const [searchParams] = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  const currentPage = Number(searchParams.get("page") || "0");
  const pageSize = Number(searchParams.get("size") || "10");
  const courseId = courseIdParam ? Number(courseIdParam) : undefined;

  // Fetch lightweight course picker options (id + title) for the filter dropdown
  const {
    data: courses = [],
    isLoading: coursesLoading,
    error: coursesError,
  } = useQuery({
    queryKey: queryKeys.teacherCourses.picker(userId),
    queryFn: async () => {
      if (!userId) throw new Error("User not found");
      return teacherCourseService.getCoursePicker(userId);
    },
    staleTime: STALE_TIME_TEACHER_COURSES,
    enabled: Boolean(userId),
  });

  const [state, setState] = useState<CourseStudentsPageState>({
    enrollments: [],
    pagination: undefined,
  });
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (coursesError) {
      console.error("Failed to load course picker", coursesError);
      setError((coursesError as any).message || "Failed to load courses");
    }
  }, [coursesError]);

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!courseId) {
        setState({ enrollments: [], pagination: undefined });
        return;
      }

      try {
        setLoadingStudents(true);
        setError(null);

        const response = await teacherCourseService.getCourseStudents(courseId, {
          page: currentPage,
          size: pageSize,
        });

        setState({
          enrollments: response.data || [],
          pagination: response.pagination,
        });
      } catch (err: any) {
        console.error("Failed to load students", err);
        const message = err.message || "Failed to load students";
        setError(message);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [courseId, currentPage, pageSize]);

  const refreshStudents = useCallback(async () => {
    if (!courseId) return;

    const response = await teacherCourseService.getCourseStudents(courseId, {
      page: currentPage,
      size: pageSize,
    });

    setState({
      enrollments: response.data || [],
      pagination: response.pagination,
    });
  }, [courseId, currentPage, pageSize]);

  return {
    courses,
    coursesLoading,
    enrollments: state.enrollments,
    pagination: state.pagination,
    loadingStudents,
    error,
    setError,
    refreshStudents,
  };
};
