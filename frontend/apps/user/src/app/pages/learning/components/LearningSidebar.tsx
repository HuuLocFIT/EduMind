import React from 'react';
import type { EnrollmentResponse, EnrollmentStatsResponse } from '@edumind/shared-types';
import { Flame, Play, Zap, ChevronRight, GraduationCap } from 'lucide-react';

interface LearningSidebarProps {
  stats: EnrollmentStatsResponse | undefined;
  enrollments: EnrollmentResponse[];
  onStartLearning: () => void;
  onBrowseCourses: () => void;
}

export const LearningSidebar: React.FC<LearningSidebarProps> = ({
  stats,
  enrollments,
  onStartLearning,
  onBrowseCourses,
}) => {
  const totalLessons = enrollments.reduce((acc, e) => acc + (e.totalLessons || 0), 0);
  const completedLessons = enrollments.reduce((acc, e) => acc + (e.completedLessons || 0), 0);
  const completedCourses = stats?.completed ?? 0;
  const totalCourses = Math.max(stats?.total ?? 1, 1);
  const progressPercentage = (completedCourses / totalCourses) * 264;

  return (
    <aside className="lg:w-80 space-y-6">
      {/* Learning Progress Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Your Progress
        </h3>
        <div className="flex items-center gap-4 mb-5">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90">
              <circle cx="48" cy="48" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
              <circle
                cx="48"
                cy="48"
                r="42"
                stroke="#3b82f6"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${progressPercentage} 264`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{completedCourses}</span>
              <span className="text-xs text-slate-500">of {stats?.total ?? 0}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-slate-900 font-semibold text-lg">
              {completedCourses === 0 ? 'Just Getting Started!' : `${completedCourses} Courses Done`}
            </p>
            <p className="text-slate-500 text-sm mt-1">{stats?.active ?? 0} courses in progress</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Total Lessons</span>
            <span className="font-semibold text-slate-900">{totalLessons}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Completed Lessons</span>
            <span className="font-semibold text-slate-900">{completedLessons}</span>
          </div>
        </div>
      </div>

      {/* Motivation Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Ready to Learn?</h3>
            <p className="text-blue-200 text-sm">Make today count!</p>
          </div>
        </div>
        <p className="text-blue-100 text-sm mb-4">
          You have {stats?.active ?? 0} active courses. Every lesson brings you closer to your goals!
        </p>
        <button
          onClick={onStartLearning}
          className="w-full bg-white text-blue-600 hover:bg-blue-50 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Learning Now
        </button>
      </div>

      {/* Quick Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Pro Tip</h3>
            <p className="text-slate-600 text-sm">
              Studies show that learning for just 20 minutes daily leads to 5x better retention than cramming
              sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Explore More */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-4">Explore More Courses</h3>
        <p className="text-slate-500 text-sm mb-4">Expand your skills with our curated collection of courses.</p>
        <button
          onClick={onBrowseCourses}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          Browse Catalog
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
