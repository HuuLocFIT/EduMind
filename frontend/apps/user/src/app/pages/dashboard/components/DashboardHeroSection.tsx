import React from 'react';
import type { EnrollmentResponse } from '@edumind/shared-types';
import { Flame, Play, Zap } from 'lucide-react';
import { DashboardStatsGrid } from './DashboardStatsGrid';

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
  mostRecentCourse: EnrollmentResponse | null;
  onContinueLearning: (enrollment: EnrollmentResponse) => void;
}

export const DashboardHeroSection: React.FC<DashboardHeroSectionProps> = ({
  greeting,
  userName,
  stats,
  mostRecentCourse,
  onContinueLearning,
}) => {
  return (
    <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              Welcome back to your learning journey. You have {stats.totalCourses} courses enrolled.
            </p>

            {/* Quick Action - Continue Learning */}
            {mostRecentCourse && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 max-w-lg hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-amber-300 text-sm mb-3">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">
                    {mostRecentCourse.progressPercentage && mostRecentCourse.progressPercentage > 0
                      ? 'Jump back in'
                      : 'Start Learning'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <img
                    src={mostRecentCourse.courseThumbnail || '/placeholder.svg'}
                    alt={mostRecentCourse.courseTitle}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{mostRecentCourse.courseTitle}</h3>
                    <p className="text-blue-200 text-sm">
                      {mostRecentCourse.completedLessons || 0} of {mostRecentCourse.totalLessons || 0} lessons completed
                    </p>
                  </div>
                  <button
                    onClick={() => onContinueLearning(mostRecentCourse)}
                    className="bg-white text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 shadow-lg flex-shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {mostRecentCourse.progressPercentage && mostRecentCourse.progressPercentage > 0
                      ? 'Continue'
                      : 'Start'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <DashboardStatsGrid stats={stats} />
        </div>
      </div>
    </section>
  );
};
