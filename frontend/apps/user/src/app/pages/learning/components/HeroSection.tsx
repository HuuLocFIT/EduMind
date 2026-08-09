import React from 'react';
import type { EnrollmentResponse, EnrollmentStatsResponse } from '@edumind/shared-types';
import { Flame, Play, Zap } from 'lucide-react';
import { StatsGrid } from './StatsGrid';
import { CloudinaryImage } from '@edumind/user-ui';

interface HeroSectionProps {
  userName?: string;
  stats: EnrollmentStatsResponse | undefined;
  mostRecentCourse: EnrollmentResponse | null;
  onContinueLearning: (enrollment: EnrollmentResponse) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
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
                <span>Start your learning journey!</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">
              Welcome back{userName ? `, ${userName}` : ''}!
            </h1>
            <p className="text-blue-100 text-lg mb-6">
              You have {stats?.total ?? 0} courses waiting for you. Let's make progress today!
            </p>

            {/* Quick Action - Continue Learning */}
            {mostRecentCourse && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 max-w-lg hover:bg-white/15 transition-colors">
                <div className="flex items-center gap-2 text-amber-300 text-sm mb-3">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">Jump back in</span>
                </div>
                <div className="flex items-center gap-4">
                  <CloudinaryImage
                    src={mostRecentCourse.courseThumbnail}
                    alt={mostRecentCourse.courseTitle}
                    widths={[128]}
                    priority={true}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg truncate">{mostRecentCourse.courseTitle}</h2>
                    <p className="text-blue-200 text-sm">
                      {mostRecentCourse.completedLessons || 0} of {mostRecentCourse.totalLessons || 0} lessons completed
                    </p>
                  </div>
                  <button
                    onClick={() => onContinueLearning(mostRecentCourse)}
                    className="bg-white text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-105 shadow-lg flex-shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <StatsGrid stats={stats} />
        </div>
      </div>
    </section>
  );
};
