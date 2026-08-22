import React from "react";
import { BookOpen, TrendingUp, CheckCircle2, Timer } from "lucide-react";

interface DashboardStats {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  notStarted: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({
  stats,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const statItems = [
    {
      icon: BookOpen,
      color: "bg-blue-500/30",
      value: stats.totalCourses,
      label: "Total Courses",
    },
    {
      icon: TrendingUp,
      color: "bg-emerald-500/30",
      value: stats.activeCourses,
      label: "In Progress",
    },
    {
      icon: CheckCircle2,
      color: "bg-purple-500/30",
      value: stats.completedCourses,
      label: "Completed",
    },
    {
      icon: Timer,
      color: "bg-amber-500/30",
      value: stats.notStarted,
      label: "Not Started",
    },
  ];

  return isError ? (
    <div
      role="alert"
      className="flex min-h-48 w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-white/20 bg-white/10 p-6 text-center"
    >
      <p className="font-semibold">Could not load learning stats</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700"
      >
        Retry
      </button>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-4">
      {statItems.map(({ icon: Icon, color, value, label }) => (
        <div
          key={label}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center"
        >
          <div
            className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mx-auto mb-3`}
          >
            <Icon className="w-7 h-7" />
          </div>
          {isLoading ? (
            <div className="h-10 w-10 mx-auto mb-1 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            <p className="text-4xl font-bold">{value}</p>
          )}
          <p className="text-blue-200 text-sm">{label}</p>
        </div>
      ))}
    </div>
  );
};
