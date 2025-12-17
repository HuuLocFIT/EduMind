import React from "react";
import { EnrollmentStatus } from "@edumind/shared-constants";

interface StatusBadgeProps {
  status: keyof typeof EnrollmentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const label = status.charAt(0) + status.slice(1).toLowerCase();

  const config: Record<
    keyof typeof EnrollmentStatus,
    { bg: string; text: string }
  > = {
    ACTIVE: { bg: "bg-green-100", text: "text-green-700" },
    COMPLETED: { bg: "bg-blue-100", text: "text-blue-700" },
    SUSPENDED: { bg: "bg-amber-100", text: "text-amber-700" },
    EXPIRED: { bg: "bg-gray-100", text: "text-gray-700" },
    DROPPED: { bg: "bg-red-100", text: "text-red-700" },
  };

  const colors = config[status] ?? config.ACTIVE;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {label}
    </span>
  );
};
