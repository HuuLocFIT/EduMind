import React from "react";
import { DollarSign, Gift } from "lucide-react";

interface CourseTypeBadgeProps {
  isPaid: boolean;
}

export const CourseTypeBadge: React.FC<CourseTypeBadgeProps> = ({
  isPaid,
}) => {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <DollarSign className="w-3 h-3" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <Gift className="w-3 h-3" />
      Free
    </span>
  );
};

