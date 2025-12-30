import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@edumind/user-ui";
import { teacherCourseService } from "../../../../services/teacher-course.service";
import { queryKeys } from "../../../../lib/query-keys";
import type { ReviewModalState, DeleteModalState } from "../types/reviews.types";

export const useReviewMutations = () => {
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const [processingReviewId, setProcessingReviewId] = useState<number | null>(null);
  const [replyModal, setReplyModal] = useState<ReviewModalState>({
    isOpen: false,
    reviewId: null,
    mode: "create",
  });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    reviewId: null,
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({
      reviewId,
      reply,
      mode,
    }: {
      reviewId: number;
      reply: string;
      mode: "create" | "edit";
    }) => {
      if (mode === "create") {
        return teacherCourseService.replyToReview(reviewId, reply);
      } else {
        return teacherCourseService.updateReply(reviewId, reply);
      }
    },
    onMutate: async ({ reviewId }) => {
      setProcessingReviewId(reviewId);
    },
    onSuccess: async (_, variables) => {
      showSuccess(
        variables.mode === "create"
          ? "Reply added successfully"
          : "Reply updated successfully"
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherReviews.all,
        exact: false,
      });
      setReplyModal({ isOpen: false, reviewId: null, mode: "create" });
      setProcessingReviewId(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save reply";
      showError(message);
      setProcessingReviewId(null);
    },
  });

  // Delete reply mutation
  const deleteReplyMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      return teacherCourseService.deleteReply(reviewId);
    },
    onMutate: async (reviewId: number) => {
      setProcessingReviewId(reviewId);
    },
    onSuccess: async () => {
      showSuccess("Reply deleted successfully");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherReviews.all,
        exact: false,
      });
      setDeleteModal({ isOpen: false, reviewId: null });
      setProcessingReviewId(null);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete reply";
      showError(message);
      setProcessingReviewId(null);
    },
  });

  const handleSubmitReply = useCallback(
    async (reviewId: number, reply: string): Promise<void> => {
      replyMutation.mutate({
        reviewId,
        reply,
        mode: replyModal.mode,
      });
    },
    [replyModal.mode, replyMutation]
  );

  const handleConfirmDelete = useCallback(
    async (reviewId: number): Promise<void> => {
      deleteReplyMutation.mutate(reviewId);
    },
    [deleteReplyMutation]
  );

  return {
    replyModal,
    setReplyModal,
    deleteModal,
    setDeleteModal,
    processingReviewId,
    handleSubmitReply,
    handleConfirmDelete,
  };
};

