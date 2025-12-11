import React from "react";
import type { CourseResponse } from "@edumind/shared-types";
import { Modal, Button } from "@edumind/user-ui";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseResponse | null;
  onConfirm: () => void;
  deleting: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  course,
  onConfirm,
  deleting,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Course" size="sm">
      <div className="space-y-4">
        <p className="text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold">"{course?.title}"</span>? This action
          cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={deleting}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

