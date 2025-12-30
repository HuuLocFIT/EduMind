import React, { useCallback, useMemo } from "react";
import type { ReviewResponse } from "@edumind/shared-types";
import { ReplyModal } from "../../components/teacher/reviews/ReplyModal";
import { DeleteReplyModal } from "../../components/teacher/reviews/DeleteReplyModal";
import { RatingDistributionChart } from "../../components/teacher/reviews/RatingDistributionChart";
import { Pagination } from "../../components/teacher/courses/list";
import { useTeacherReviews, useReviewMutations, useReviewFilters } from "./reviews/hooks";
import { ReviewsStats, ReviewsFilters, ReviewsList } from "./reviews/components";
import type { FilterTab } from "./reviews/types";

const TeacherReviewsPage: React.FC = () => {
  // Custom hooks
  const filters = useReviewFilters();
  const {
    reviews,
    totalElements,
    totalPages,
    loading,
    stats,
    statsLoading,
    courses,
  } = useTeacherReviews(filters.queryParams);
  const {
    replyModal,
    setReplyModal,
    deleteModal,
    setDeleteModal,
    processingReviewId,
    handleSubmitReply,
    handleConfirmDelete,
  } = useReviewMutations();

  // Modal handlers
  const handleReply = useCallback((review: ReviewResponse) => {
    setReplyModal({ isOpen: true, reviewId: review.id, mode: "create" });
  }, [setReplyModal]);

  const handleEditReply = useCallback((review: ReviewResponse) => {
    setReplyModal({ isOpen: true, reviewId: review.id, mode: "edit" });
  }, [setReplyModal]);

  const handleDeleteReply = useCallback((review: ReviewResponse) => {
    setDeleteModal({ isOpen: true, reviewId: review.id });
  }, [setDeleteModal]);

  const handleReplyModalClose = useCallback(() => {
    setReplyModal({ isOpen: false, reviewId: null, mode: "create" });
  }, [setReplyModal]);

  const handleDeleteModalClose = useCallback(() => {
    setDeleteModal({ isOpen: false, reviewId: null });
  }, [setDeleteModal]);

  // Tabs configuration
  const tabs = useMemo<{ key: FilterTab; label: string; count?: number }[]>(
    () => [
      { key: "all", label: "All", count: stats?.totalReviews },
      { key: "replied", label: "Replied", count: stats?.repliedCount },
      { key: "unreplied", label: "Need Reply", count: stats?.needReplyCount },
    ],
    [stats]
  );

  // Find review objects for modals
  const replyReview = useMemo(() => {
    if (!replyModal.reviewId || !reviews.length) return null;
    return reviews.find((r) => r.id === replyModal.reviewId) || null;
  }, [replyModal.reviewId, reviews]);

  const deleteReview = useMemo(() => {
    if (!deleteModal.reviewId || !reviews.length) return null;
    return reviews.find((r) => r.id === deleteModal.reviewId) || null;
  }, [deleteModal.reviewId, reviews]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Course Reviews</h1>
        <p className="text-gray-500 mt-1">
          Manage and respond to student reviews across your courses
        </p>
      </div>

      {/* Stats */}
      <ReviewsStats stats={stats} isLoading={statsLoading} />

      {/* Rating Distribution */}
      {stats && !statsLoading && (
        <div>
          <RatingDistributionChart
            distribution={stats.ratingDistribution}
            totalReviews={stats.totalReviews}
            averageRating={stats.averageRating}
          />
        </div>
      )}

      {/* Filters */}
      <ReviewsFilters
        tabs={tabs}
        statusFilter={filters.statusFilter}
        courseFilter={filters.courseFilter}
        ratingFilter={filters.ratingFilter}
        sortBy={filters.sortBy}
        sortDir={filters.sortDir}
        loading={loading}
        courses={courses}
        onStatusTabClick={filters.handleStatusTabClick}
        onCourseFilterChange={filters.handleCourseFilterChange}
        onRatingFilterChange={filters.handleRatingFilterChange}
        onSortByChange={filters.handleSortByChange}
        onSortDirToggle={filters.handleSortDirToggle}
        onRefresh={filters.handleRefresh}
      />

      {/* Reviews List */}
      <ReviewsList
        reviews={reviews}
        loading={loading}
        statusFilter={filters.statusFilter}
        processingReviewId={processingReviewId}
        onReply={handleReply}
        onEditReply={handleEditReply}
        onDeleteReply={handleDeleteReply}
      />

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div>
          <Pagination
            page={filters.currentPage}
            size={filters.pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={filters.handlePageChange}
          />
        </div>
      )}

      {/* Reply Modal */}
      <ReplyModal
        isOpen={replyModal.isOpen}
        onClose={handleReplyModalClose}
        review={replyReview}
        onSubmit={handleSubmitReply}
        mode={replyModal.mode}
      />

      {/* Delete Modal */}
      <DeleteReplyModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteModalClose}
        review={deleteReview}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default TeacherReviewsPage;
