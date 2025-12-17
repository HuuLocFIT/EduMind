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
            Enrollment management rules
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>
              <strong>⏸️ Suspend:</strong> Temporarily block the student's
              access to this course. The course still appears in{" "}
              <strong>My Learning</strong>, but it is shown as locked (dimmed /
              with a lock icon). The student cannot access lessons or submit new
              reviews, and any existing certificate is temporarily locked. When
              you activate the enrollment again, access and the certificate are
              immediately restored.
            </p>
            <p>
              <strong>⛔ Dropped / Unenroll:</strong> Permanently end the
              student's participation in this course. The course disappears from{" "}
              <strong>My Learning</strong>, and the student cannot access
              lessons or leave reviews. Any certificate associated with this
              enrollment is <strong>permanently revoked</strong>. If the student
              enrolls again in the future, it is treated as a new enrollment and
              may earn a new certificate, but the previous certificate is never
              restored.
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
