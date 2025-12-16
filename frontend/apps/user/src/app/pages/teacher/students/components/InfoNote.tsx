import React from "react";
import { Info } from "lucide-react";

interface InfoNoteProps {
  show: boolean;
}

export const InfoNote: React.FC<InfoNoteProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-semibold text-blue-900">
            Important Information
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>Suspend:</strong> Temporarily suspend student access to
              the course. You can reactivate them later. Requires a reason.
            </p>
            <p>
              <strong>Unenroll:</strong> Permanently remove a student from the
              course.
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                For <strong>Free courses</strong>: Unenrollment happens
                immediately.
              </li>
              <li>
                For <strong>Paid courses</strong>: Unenrollment requires admin
                approval. Click "Unenroll" to submit a request with a reason.
                Admin will review and process your request.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

