import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@edumind/user-ui";
import type { EnrollmentResponse } from "@edumind/shared-types";

interface UnenrollConfirmModalProps {
  open: boolean;
  enrollment: EnrollmentResponse | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const UnenrollConfirmModal: React.FC<UnenrollConfirmModalProps> = ({
  open,
  enrollment,
  isLoading,
  onConfirm,
  onClose,
}) => {
  if (!open || !enrollment) return null;

  const studentName =
    enrollment.studentName || `Student #${enrollment.studentId}`;
  const courseTitle = enrollment.courseTitle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Unenrollment
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to permanently remove{" "}
                <strong className="text-gray-900">{studentName}</strong> from
                the course{" "}
                <strong className="text-gray-900">{courseTitle}</strong>?
              </p>
              <p className="text-sm text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
