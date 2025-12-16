import React from "react";
import { X } from "lucide-react";
import { Button } from "@edumind/user-ui";
import type { EnrollmentResponse } from "@edumind/shared-types";

interface SuspendModalProps {
  open: boolean;
  enrollment: EnrollmentResponse | null;
  reason: string;
  reasonError: string;
  isLoading: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const SuspendModal: React.FC<SuspendModalProps> = ({
  open,
  enrollment,
  reason,
  reasonError,
  isLoading,
  onReasonChange,
  onConfirm,
  onClose,
}) => {
  if (!open || !enrollment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Suspend Student Access
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Why are you suspending this student? (Spam, Offensive language,
            etc.)
          </p>

          <div className="mb-4">
            <textarea
              value={reason}
              onChange={(e) => {
                onReasonChange(e.target.value);
              }}
              placeholder="Enter reason for suspension..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                reasonError ? "border-red-500" : "border-gray-300"
              }`}
              rows={4}
              maxLength={500}
            />
            {reasonError && (
              <p className="mt-1 text-sm text-red-600">{reasonError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {reason.length}/500 characters
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isLoading}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Suspend Access
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

