import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@edumind/user-ui";
import {
  MessageSquare,
  Star,
  CheckCircle,
  Clock,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  Loader2,
  MessageSquareOff,
} from "lucide-react";
import { teacherCourseService } from "../../services/teacher-course.service";
import type {
  ReviewResponse,
  InstructorReviewsStatsResponse,
  CourseWithReviews,
} from "@edumind/shared-types";
import { TeacherReviewCard } from "../../components/teacher/reviews/TeacherReviewCard";  
import { ReplyModal } from "../../components/teacher/reviews/ReplyModal";
import { DeleteReplyModal } from "../../components/teacher/reviews/DeleteReplyModal";
import { RatingDistributionChart } from "../../components/teacher/reviews/RatingDistributionChart";
import { Pagination } from "../../components/teacher/courses/list";

type FilterTab = "all" | "replied" | "unreplied";

const TeacherReviewsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();

  // Data State
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [stats, setStats] = useState<InstructorReviewsStatsResponse | null>(null);
  const [courses, setCourses] = useState<CourseWithReviews[]>([]);
  
  // Loading State
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  
  // Pagination
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Modal State
  const [replyModal, setReplyModal] = useState<{
    isOpen: boolean;
    review: ReviewResponse | null;
    mode: "create" | "edit";
  }>({ isOpen: false, review: null, mode: "create" });
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    review: ReviewResponse | null;
  }>({ isOpen: false, review: null });

  // URL Params
  const currentPage = parseInt(searchParams.get("page") || "0");
  const pageSize = parseInt(searchParams.get("size") || "10");
  const courseFilter = searchParams.get("courseId") || "";
  const statusFilter = (searchParams.get("status") as FilterTab) || "all";
  const ratingFilter = searchParams.get("rating") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") as "asc" | "desc") || "desc";

  // ==================== DATA FETCHING ====================

  const fetchCourses = useCallback(async () => {
    try {
      const data = await teacherCourseService.getCoursesWithReviews();
      setCourses(data);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await teacherCourseService.getInstructorReviewsStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      
      const hasReply = statusFilter === "replied" 
        ? true 
        : statusFilter === "unreplied" 
        ? false 
        : undefined;

      const response = await teacherCourseService.getInstructorReviews({
        page: currentPage,
        size: pageSize,
        courseId: courseFilter ? parseInt(courseFilter) : undefined,
        rating: ratingFilter ? parseInt(ratingFilter) : undefined,
        hasReply,
        sortBy: sortBy as "createdAt" | "rating" | "updatedAt",
        sortDir,
      });

      setReviews(response.data || []);
      setTotalElements(response.pagination?.totalElements || 0);
      setTotalPages(response.pagination?.totalPages || 0);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      showError("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, courseFilter, statusFilter, ratingFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, [fetchCourses, fetchStats]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ==================== HANDLERS ====================

  const updateParams = (updates: Record<string, string | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // Reset page when filters change
    if (!("page" in updates)) {
      newParams.set("page", "0");
    }

    setSearchParams(newParams);
  };

  const handleReply = (review: ReviewResponse) => {
    setReplyModal({ isOpen: true, review, mode: "create" });
  };

  const handleEditReply = (review: ReviewResponse) => {
    setReplyModal({ isOpen: true, review, mode: "edit" });
  };

  const handleDeleteReply = (review: ReviewResponse) => {
    setDeleteModal({ isOpen: true, review });
  };

  const handleSubmitReply = async (reviewId: number, reply: string) => {
    setProcessing(reviewId);
    try {
      if (replyModal.mode === "create") {
        await teacherCourseService.replyToReview(reviewId, reply);
        showSuccess("Reply added successfully");
      } else {
        await teacherCourseService.updateReply(reviewId, reply);
        showSuccess("Reply updated successfully");
      }
      fetchReviews();
      fetchStats();
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmDelete = async (reviewId: number) => {
    setProcessing(reviewId);
    try {
      await teacherCourseService.deleteReply(reviewId);
      showSuccess("Reply deleted successfully");
      fetchReviews();
      fetchStats();
    } finally {
      setProcessing(null);
    }
  };

  // ==================== RENDER ====================

  const renderStats = () => {
    if (statsLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      );
    }

    if (!stats) return null;

    const statItems = [
      {
        label: "Total Reviews",
        value: stats.totalReviews,
        icon: MessageSquare,
        color: "blue",
      },
      {
        label: "Avg Rating",
        value: stats.averageRating.toFixed(1),
        icon: Star,
        color: "yellow",
      },
      {
        label: "Replied",
        value: stats.repliedCount,
        icon: CheckCircle,
        color: "green",
      },
      {
        label: "Need Reply",
        value: stats.needReplyCount,
        icon: Clock,
        color: "orange",
      },
    ];

    const colorClasses: Record<string, { bg: string; icon: string; text: string }> = {
      blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-600" },
      yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", text: "text-yellow-600" },
      green: { bg: "bg-green-50", icon: "text-green-600", text: "text-green-600" },
      orange: { bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-600" },
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const colors = colorClasses[item.color];
          return (
            <div
              key={item.label}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${colors.bg}`}>
                  <item.icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFilters = () => {
    const tabs: { key: FilterTab; label: string; count?: number }[] = [
      { key: "all", label: "All", count: stats?.totalReviews },
      { key: "replied", label: "Replied", count: stats?.repliedCount },
      { key: "unreplied", label: "Need Reply", count: stats?.needReplyCount },
    ];

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => updateParams({ status: tab.key === "all" ? undefined : tab.key })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key || (tab.key === "all" && !statusFilter)
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">Filters:</span>
          </div>

          {/* Course Filter */}
          <select
            value={courseFilter}
            onChange={(e) => updateParams({ courseId: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => updateParams({ rating: e.target.value })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} Star{r > 1 ? "s" : ""}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => updateParams({ sortBy: e.target.value })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt">Date</option>
              <option value="rating">Rating</option>
            </select>
            <button
              onClick={() => updateParams({ sortDir: sortDir === "desc" ? "asc" : "desc" })}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={sortDir === "desc" ? "Newest first" : "Oldest first"}
            >
              {sortDir === "desc" ? (
                <SortDesc className="w-4 h-4" />
              ) : (
                <SortAsc className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              fetchReviews();
              fetchStats();
            }}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    );
  };

  const renderReviews = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (reviews.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <MessageSquareOff className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reviews found
          </h3>
          <p className="text-gray-500">
            {statusFilter === "unreplied"
              ? "Great job! You've replied to all reviews."
              : "No reviews match your current filters."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {reviews.map((review) => (
          <TeacherReviewCard
            key={review.id}
            review={review}
            onReply={handleReply}
            onEditReply={handleEditReply}
            onDeleteReply={handleDeleteReply}
            isProcessing={processing === review.id}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Course Reviews</h1>
        <p className="text-gray-500 mt-1">
          Manage and respond to student reviews across your courses
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6">{renderStats()}</div>

      {/* Rating Distribution */}
      {stats && !statsLoading && (
        <div className="mb-6">
          <RatingDistributionChart
            distribution={stats.ratingDistribution}
            totalReviews={stats.totalReviews}
            averageRating={stats.averageRating}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">{renderFilters()}</div>

      {/* Reviews List */}
      {renderReviews()}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={currentPage}
            size={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={(page) => updateParams({ page: page.toString() })}
          />
        </div>
      )}

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyModal.isOpen}
        onClose={() => setReplyModal({ isOpen: false, review: null, mode: "create" })}
        review={replyModal.review}
        onSubmit={handleSubmitReply}
        mode={replyModal.mode}
      />

      {/* Delete Modal */}
      <DeleteReplyModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, review: null })}
        review={deleteModal.review}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default TeacherReviewsPage;