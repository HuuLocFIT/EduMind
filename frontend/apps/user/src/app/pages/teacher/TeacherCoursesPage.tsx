import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { teacherCourseService } from '../../services/teacher-course.service';
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import type {
  CoursePagedResponse,
  CourseResponse,
} from "@edumind/shared-types";
import { Button, Alert, useModal, useToast } from "@edumind/user-ui";
import {
  CourseCard,
  GridSkeleton,
  ListSkeleton,
  FiltersBar,
  ArchiveModal,
  EmptyState,
  Pagination,
  type ViewMode,
  type FilterState,
} from "../../components/teacher/courses/list";
import { Plus } from "lucide-react";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_TEACHER_COURSES } from "../../lib/query-config";

export const TeacherCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { success: showSuccess, error: showError } = useToast();
  const archiveModal = useModal();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [courseToArchive, setCourseToArchive] = useState<CourseResponse | null>(
    null
  );

  // Pagination
  const [pagination, setPagination] = useState({
    page: 0,
    size: 12,
  });

  // Filters from URL
  const filters: FilterState = {
    status: (searchParams.get("status") as FilterState["status"]) || "ALL",
    search: searchParams.get("search") || "",
  };

  // Use React Query for caching and better performance
  const {
    data: coursesResponse,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: queryKeys.teacherCourses.list(
      user?.id,
      pagination.page,
      pagination.size
    ),
    queryFn: async () => {
      if (!user?.id) throw new Error("User not found");
      return teacherCourseService.getMyCourses(user.id, {
        page: pagination.page,
        size: pagination.size,
      });
    },
    staleTime: STALE_TIME_TEACHER_COURSES,
    enabled: Boolean(user?.id),
    // Keep previous data while fetching new page to prevent flash loading
    placeholderData: (previousData) => previousData,
  });

  const courses = coursesResponse?.data || [];
  const paginationData = {
    page: pagination.page,
    size: pagination.size,
    totalElements: coursesResponse?.pagination?.totalElements || 0,
    totalPages: coursesResponse?.pagination?.totalPages || 0,
  };

  // Filter courses locally (since API doesn't have filter endpoint for instructor courses)
  const filteredCourses = useMemo(() => {
    let result = courses;

    // Filter by status
    if (filters.status !== "ALL") {
      result = result.filter((c) => c.status === filters.status);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(searchLower) ||
          c.shortDescription?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [courses, filters]);

  // Handlers
  const updateFilter = (key: keyof FilterState, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "ALL") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const archiveMutation = useMutation({
    mutationFn: ({ courseId, reason }: { courseId: number; reason?: string }) =>
      teacherCourseService.archiveCourse(courseId, reason),
    onSuccess: async (archivedCourse) => {
      const listKey = queryKeys.teacherCourses.list(user?.id, pagination.page, pagination.size);
      queryClient.setQueryData<CoursePagedResponse>(listKey, (old) => old ? {
        ...old,
        data: old.data.map((course: CourseResponse) =>
          course.id === archivedCourse.id ? archivedCourse : course
        ),
      } : old);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherCourses.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        exact: false,
      });
      showSuccess("Course archived successfully");
      archiveModal.close();
      setCourseToArchive(null);
    },
    onError: (err: any) => {
      // apiClient's interceptor rejects with a FLAT ApiError ({ message, status, ... }),
      // not an AxiosError — reading only err.response.* meant the 409 branch never fired
      // and every archive failure fell through to the generic message. Keep the AxiosError
      // shape as a fallback for errors raised outside the interceptor.
      const status = err?.status ?? err?.response?.status;
      const backendMessage = err?.message ?? err?.response?.data?.message;
      showError(status === 409
        ? "This course has protected students and must be archived by an administrator. Please contact an admin."
        : backendMessage || "Failed to archive course");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: number) => {
      await teacherCourseService.publishCourse(courseId);
      return courseId;
    },
    onMutate: async (courseId) => {
      const listKey = queryKeys.teacherCourses.list(user?.id, pagination.page, pagination.size);
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<CoursePagedResponse>(listKey);
      queryClient.setQueryData<CoursePagedResponse>(listKey, (old) => {
        if (!old) return old;
        const next = {
          ...old,
          data: old.data.map((c: CourseResponse) =>
            c.id === courseId ? { ...c, status: "PUBLISHED" } : c
          ),
        };
        return next;
      });
      return { previous, listKey };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherCourses.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        exact: false,
      });
      showSuccess("Course published successfully");
    },
    onError: (err: any, _courseId, context) => {
      if (context?.previous && context.listKey) {
        queryClient.setQueryData(context.listKey, context.previous);
      }
      showError(err.message || "Failed to publish course");
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context?.listKey) {
        queryClient.invalidateQueries({ queryKey: context.listKey });
      }
    },
  });

  const handleArchive = (reason?: string) => {
    if (!courseToArchive) return;
    archiveMutation.mutate({ courseId: courseToArchive.id, reason });
  };

  const handlePublish = (course: CourseResponse) => {
    publishMutation.mutate(course.id);
  };

  const openArchiveModal = (course: CourseResponse) => {
    setCourseToArchive(course);
    archiveModal.open();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">Manage and organize your courses</p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Create Course
        </Button>
      </div>

      {/* Filters Bar */}
      <FiltersBar
        filters={filters}
        viewMode={viewMode}
        onFilterChange={updateFilter}
        onViewModeChange={setViewMode}
      />

      {/* Error */}
      {error && (
        <Alert
          variant="error"
          title="Error"
          message={(error as any)?.message || "Failed to load courses"}
          onClose={undefined}
        />
      )}

      {/* Content */}
      {loading ? (
        viewMode === "grid" ? (
          <GridSkeleton />
        ) : (
          <ListSkeleton />
        )
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          filters={filters}
          onCreateCourse={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              viewMode={viewMode}
              onView={() =>
                navigate(TeacherRouteHelpers.courseDetail(course.id))
              }
              onEdit={() => navigate(TeacherRouteHelpers.courseEdit(course.id))}
              onArchive={() => openArchiveModal(course)}
              onPublish={() => handlePublish(course)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              viewMode={viewMode}
              onView={() =>
                navigate(TeacherRouteHelpers.courseDetail(course.id))
              }
              onEdit={() => navigate(TeacherRouteHelpers.courseEdit(course.id))}
              onArchive={() => openArchiveModal(course)}
              onPublish={() => handlePublish(course)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <Pagination
          page={paginationData.page}
          size={paginationData.size}
          totalElements={paginationData.totalElements}
          totalPages={paginationData.totalPages}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
        />
      )}

      <ArchiveModal
        isOpen={archiveModal.isOpen}
        onClose={archiveModal.close}
        course={courseToArchive}
        onConfirm={handleArchive}
        archiving={archiveMutation.isPending}
      />
    </div>
  );
};

export default TeacherCoursesPage;
