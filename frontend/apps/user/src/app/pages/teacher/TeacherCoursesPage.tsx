import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { teacherCourseService } from "../../services/teacher-course.service";
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseStatus, CourseLevel } from "@edumind/shared-constants";
import type { CourseResponse, PagedResponse } from "@edumind/shared-types";
import {
  Button,
  Input,
  Skeleton,
  Alert,
  Modal,
  useModal,
  useToast,
} from "@edumind/user-ui";
import { CourseStatusBadge } from "../../components/teacher/courses/CourseStatusBadge";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  BookOpen,
  Users,
  Star,
  Clock,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = "grid" | "list";
type StatusFilter = "ALL" | keyof typeof CourseStatus;

interface FilterState {
  status: StatusFilter;
  search: string;
}

// ============================================================================
// COURSE CARD COMPONENT
// ============================================================================

interface CourseCardProps {
  course: CourseResponse;
  viewMode: ViewMode;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  viewMode,
  onView,
  onEdit,
  onDelete,
  onPublish,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const canPublish = course.status === CourseStatus.DRAFT;
  const canDelete = course.status !== CourseStatus.PUBLISHED;

  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        {/* Thumbnail */}
        <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{course.title}</h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <CourseStatusBadge status={course.status} />
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {course.totalStudents ?? 0}
            </span>
            {course.averageRating && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {course.averageRating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {course.durationHours ?? 0}h
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0">
          {course.price === 0 ? (
            <span className="text-green-600 font-medium">Free</span>
          ) : (
            <span className="font-medium">
              {course.currency} {course.effectivePrice ?? course.price}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-20">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onView();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" /> Edit Course
                </button>
                {canPublish && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPublish();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                  >
                    <Send className="w-4 h-4" /> Publish
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <CourseStatusBadge status={course.status} />
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onView}
            className="p-2 bg-white rounded-lg hover:bg-gray-100"
            title="View"
          >
            <Eye className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-white rounded-lg hover:bg-gray-100"
            title="Edit"
          >
            <Edit className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
          {course.title}
        </h3>

        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {course.totalStudents ?? 0}
          </span>
          {course.averageRating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              {course.averageRating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {course.durationHours ?? 0}h
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          {course.price === 0 ? (
            <span className="text-green-600 font-semibold">Free</span>
          ) : (
            <div>
              {course.discountPrice && course.discountPrice < course.price ? (
                <>
                  <span className="text-gray-400 line-through text-sm">
                    {course.currency} {course.price}
                  </span>
                  <span className="font-semibold text-gray-900 ml-2">
                    {course.currency} {course.discountPrice}
                  </span>
                </>
              ) : (
                <span className="font-semibold text-gray-900">
                  {course.currency} {course.price}
                </span>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-lg shadow-lg border py-1 z-20">
                  {canPublish && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onPublish();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                    >
                      <Send className="w-4 h-4" /> Publish
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// LOADING SKELETONS
// ============================================================================

const GridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-xl border overflow-hidden">
        <Skeleton className="aspect-video" />
        <div className="p-4">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const ListSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 p-4 bg-white rounded-lg border"
      >
        <Skeleton className="w-20 h-14 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TeacherCoursesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { showToast, success: showSuccess, error: showError } = useToast();
  const deleteModal = useModal();

  // State
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [courseToDelete, setCourseToDelete] = useState<CourseResponse | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 0,
    size: 12,
    totalElements: 0,
    totalPages: 0,
  });

  // Filters from URL
  const filters: FilterState = {
    status: (searchParams.get("status") as StatusFilter) || "ALL",
    search: searchParams.get("search") || "",
  };

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await teacherCourseService.getMyCourses(user.id, {
          page: pagination.page,
          size: pagination.size,
        });

        setCourses(response.data || []);
        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            totalElements: response.pagination!.totalElements,
            totalPages: response.pagination!.totalPages,
          }));
        }
      } catch (err: any) {
        console.error("Failed to fetch courses:", err);
        setError(err.message || "Failed to load courses");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user?.id, pagination.page, pagination.size]);

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
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
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
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id ? { ...c, status: CourseStatus.PUBLISHED } : c
        )
      );
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
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Search courses..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="ALL">All Status</option>
            <option value={CourseStatus.DRAFT}>Draft</option>
            <option value={CourseStatus.PENDING_REVIEW}>Pending Review</option>
            <option value={CourseStatus.PUBLISHED}>Published</option>
            <option value={CourseStatus.ARCHIVED}>Archived</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${
                viewMode === "grid"
                  ? "bg-green-50 text-green-600"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${
                viewMode === "list"
                  ? "bg-green-50 text-green-600"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
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
        <div className="bg-white rounded-xl border p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filters.search || filters.status !== "ALL"
              ? "No courses found"
              : "No courses yet"}
          </h3>
          <p className="text-gray-600 mb-6">
            {filters.search || filters.status !== "ALL"
              ? "Try adjusting your filters"
              : "Create your first course to get started"}
          </p>
          {!filters.search && filters.status === "ALL" && (
            <Button
              variant="primary"
              onClick={() => navigate(TEACHER_ROUTES.COURSE_CREATE)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="bg-green-600 hover:bg-green-700"
            >
              Create Your First Course
            </Button>
          )}
        </div>
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
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-600">
            Showing {pagination.page * pagination.size + 1} to{" "}
            {Math.min(
              (pagination.page + 1) * pagination.size,
              pagination.totalElements
            )}{" "}
            of {pagination.totalElements} courses
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 0}
              className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm">
              Page {pagination.page + 1} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages - 1}
              className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        title="Delete Course"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">"{courseToDelete?.title}"</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={deleteModal.close}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherCoursesPage;
