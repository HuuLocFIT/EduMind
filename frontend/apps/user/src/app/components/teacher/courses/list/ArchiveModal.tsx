import React, { useEffect, useState } from "react";
import type { CourseResponse } from "@edumind/shared-types";
import { Modal, Button } from "@edumind/user-ui";

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseResponse | null;
  onConfirm: (reason?: string) => void;
  archiving: boolean;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  isOpen,
  onClose,
  course,
  onConfirm,
  archiving,
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isOpen) setReason("");
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Archive Course" size="sm">
      <div className="space-y-4">
        <p className="text-gray-600">
          Archive <span className="font-semibold">&quot;{course?.title}&quot;</span>?
          The course will become read-only and will no longer accept new students.
          Existing eligible students can continue learning.
        </p>
        <div>
          <label htmlFor="archive-reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason (optional)
          </label>
          <textarea
            id="archive-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Why are you archiving this course?"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onConfirm(reason)} isLoading={archiving}>
            Archive
          </Button>
        </div>
      </div>
    </Modal>
  );
};
