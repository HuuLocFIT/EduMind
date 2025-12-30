import React, { useMemo } from "react";
import { MessageSquare, Star, CheckCircle, Clock } from "lucide-react";
import type { InstructorReviewsStatsResponse } from "@edumind/shared-types";

interface ReviewsStatsProps {
  stats: InstructorReviewsStatsResponse | null | undefined;
  isLoading: boolean;
}

const COLOR_CLASSES = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-600" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", text: "text-yellow-600" },
  green: { bg: "bg-green-50", icon: "text-green-600", text: "text-green-600" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-600" },
} as const;

export const ReviewsStats: React.FC<ReviewsStatsProps> = ({ stats, isLoading }) => {
  const statItems = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: "Total Reviews",
        value: stats.totalReviews,
        icon: MessageSquare,
        color: "blue" as const,
      },
      {
        label: "Avg Rating",
        value: stats.averageRating.toFixed(1),
        icon: Star,
        color: "yellow" as const,
      },
      {
        label: "Replied",
        value: stats.repliedCount,
        icon: CheckCircle,
        color: "green" as const,
      },
      {
        label: "Need Reply",
        value: stats.needReplyCount,
        icon: Clock,
        color: "orange" as const,
      },
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => {
        const colors = COLOR_CLASSES[item.color];
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${colors.bg}`}>
                <Icon className={`w-5 h-5 ${colors.icon}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className={`text-2xl font-bold ${colors.text}`}>
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

