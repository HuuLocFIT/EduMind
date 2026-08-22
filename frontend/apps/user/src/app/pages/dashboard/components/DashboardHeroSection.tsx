import React from "react";
import type { EnrollmentResponse } from "@edumind/shared-types";
import { Flame, Play, Zap } from "lucide-react";
import { DashboardStatsGrid } from "./DashboardStatsGrid";
import { CloudinaryImage } from "@edumind/user-ui";

interface DashboardStats {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  notStarted: number;
}

interface DashboardHeroSectionProps {
  greeting: string;
  userName?: string;
  stats: DashboardStats;
  statsLoading?: boolean;
  statsError?: boolean;
  onRetryStats?: () => void;
  mostRecentCourse: EnrollmentResponse | null;
  onContinueLearning: (enrollment: EnrollmentResponse) => void;
}

export const DashboardHeroSection: React.FC<DashboardHeroSectionProps> = ({
  greeting,
  userName,
  stats,
  statsLoading = false,
  statsError = false,
  onRetryStats,
  mostRecentCourse,
  onContinueLearning,
}) => {
  return (
    <section
      data-testid="dashboard"
      className="relative min-h-[854px] overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white sm:min-h-[770px] md:min-h-[774px] lg:min-h-0"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Welcome Message */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse">
                <Flame className="w-4 h-4" />
                <span>Your learning journey continues!</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-blue-100 text-lg mb-6">
              Welcome back to your learning journey. You have{" "}
              {statsError ? (
                "—"
              ) : statsLoading ? (
                <span className="inline-block w-4 h-4 rounded bg-blue-400/50 animate-pulse align-middle" />
              ) : (
                stats.totalCourses
              )}{" "}
              courses enrolled.
            </p>

            {/* Quick Action - Continue Learning */}
            {!statsLoading && mostRecentCourse && (
              <div className="min-h-[194px] max-w-lg rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm transition-colors hover:bg-white/15 sm:min-h-[138px]">
                <div className="flex items-center gap-2 text-amber-300 text-sm mb-3">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">
                    {mostRecentCourse.progressPercentage &&
                    mostRecentCourse.progressPercentage > 0
                      ? "Jump back in"
                      : "Start"}
                  </span>
                </div>
                <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 sm:flex sm:gap-4">
                  <CloudinaryImage
                    src={mostRecentCourse.courseThumbnail}
                    alt={mostRecentCourse.courseTitle}
                    widths={[128]}
                    priority={true}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {mostRecentCourse.courseTitle}
                    </h3>
                    <p className="whitespace-nowrap text-sm text-blue-200">
                      {mostRecentCourse.completedLessons || 0} of{" "}
                      {mostRecentCourse.totalLessons || 0} lessons completed
                    </p>
                  </div>
                  <button
                    onClick={() => onContinueLearning(mostRecentCourse)}
                    className="col-span-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 font-semibold text-blue-600 shadow-lg transition-all hover:scale-105 hover:bg-blue-50 sm:w-auto sm:flex-shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {mostRecentCourse.progressPercentage &&
                    mostRecentCourse.progressPercentage > 0
                      ? "Continue"
                      : "Start"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <DashboardStatsGrid
            stats={stats}
            isLoading={statsLoading}
            isError={statsError}
            onRetry={onRetryStats}
          />
        </div>
      </div>
    </section>
  );
};
