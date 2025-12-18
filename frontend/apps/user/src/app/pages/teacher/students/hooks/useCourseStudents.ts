import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { teacherCourseService } from "@user/services/index";
import type { CourseResponse } from "@edumind/shared-types";
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

  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [state, setState] = useState<CourseStudentsPageState>({
    enrollments: [],
    pagination: undefined,
  });
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!userId) return;
      try {
        setCoursesLoading(true);
        const response = await teacherCourseService.getMyCourses(userId, {
          page: 0,
          size: 100,
        });
        setCourses(response.data || []);
      } catch (err: any) {
        console.error("Failed to load courses", err);
        setError(err.message || "Failed to load courses");
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [userId]);

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

