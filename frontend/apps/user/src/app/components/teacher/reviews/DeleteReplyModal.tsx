import React, { useState } from "react";
import { X, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type { ReviewResponse } from "@edumind/shared-types";

interface DeleteReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: ReviewResponse | null;
  onConfirm: (reviewId: number) => Promise<void>;
}

export const DeleteReplyModal: React.FC<DeleteReplyModalProps> = ({
  isOpen,
  onClose,
  review,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!review) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm(review.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete reply");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  if (!isOpen || !review) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClose();
          }
        }}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Delete Reply
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5">
            <p className="text-gray-600">
              Are you sure you want to delete your reply to{" "}
              <span className="font-medium text-gray-900">
                {review.studentName}
              </span>
              's review? This action cannot be undone.
            </p>

            {/* Reply Preview */}
            {review.instructorReply && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 line-clamp-3">
                  "{review.instructorReply}"
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Reply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteReplyModal;