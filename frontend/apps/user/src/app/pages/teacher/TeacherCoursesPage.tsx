import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth.store";
import { teacherCourseService } from "../../services/teacher-course.service";
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import type { CourseResponse } from "@edumind/shared-types";
import { Button, Alert, useModal, useToast } from "@edumind/user-ui";
import {
  CourseCard,
  GridSkeleton,
  ListSkeleton,
  FiltersBar,
  DeleteModal,
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
  const deleteModal = useModal();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [courseToDelete, setCourseToDelete] = useState<CourseResponse | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!courseToDelete) return;

    try {
      setDeleting(true);
      await teacherCourseService.deleteCourse(courseToDelete.id);
      // Invalidate and refetch courses (using prefix matching)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherCourses.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        exact: false,
      });

      showSuccess("Course deleted successfully");
      deleteModal.close();
      setCourseToDelete(null);
    } catch (err: any) {
      showError(err.message || "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  const handlePublish = async (course: CourseResponse) => {
    try {
      await teacherCourseService.publishCourse(course.id);
      // Invalidate and refetch courses (using prefix matching)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherCourses.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        exact: false,
      });
      showSuccess("Course published successfully");
    } catch (err: any) {
      showError(err.message || "Failed to publish course");
    }
  };

  const openDeleteModal = (course: CourseResponse) => {
    setCourseToDelete(course);
    deleteModal.open();
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
          onClose={() => {}}
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
              onDelete={() => openDeleteModal(course)}
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
              onDelete={() => openDeleteModal(course)}
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

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        course={courseToDelete}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
};

export default TeacherCoursesPage;
