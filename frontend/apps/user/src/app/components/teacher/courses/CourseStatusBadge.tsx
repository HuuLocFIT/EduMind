import React from "react";
import { CourseStatus } from "@edumind/shared-constants";
import { FileText, CheckCircle, Archive } from "lucide-react";

interface CourseStatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode; label: string }
> = {
  [CourseStatus.DRAFT]: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    icon: <FileText className="w-3 h-3" />,
    label: "Draft",
  },
  [CourseStatus.PUBLISHED]: {
    bg: "bg-green-100",
    text: "text-green-700",
    icon: <CheckCircle className="w-3 h-3" />,
    label: "Published",
  },
  [CourseStatus.ARCHIVED]: {
    bg: "bg-red-100",
    text: "text-red-700",
    icon: <Archive className="w-3 h-3" />,
    label: "Archived",
  },
};

export const CourseStatusBadge: React.FC<CourseStatusBadgeProps> = ({
  status,
  size = "sm",
}) => {
  const config = statusConfig[status] || statusConfig[CourseStatus.DRAFT];
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default CourseStatusBadge;
