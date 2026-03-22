import React from 'react';
import type { EnrollmentStatsResponse } from '@edumind/shared-types';
import {
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Timer,
} from 'lucide-react';

interface StatsGridProps {
  stats: EnrollmentStatsResponse | undefined;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  const totalCourses = stats?.total ?? 0;
  const startedCourses = stats?.started ?? 0;
  const notStartedCourses = Math.max(totalCourses - startedCourses, 0);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-blue-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <BookOpen className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats?.total ?? 0}</p>
        <p className="text-blue-200 text-sm">Total Courses</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <TrendingUp className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats?.active ?? 0}</p>
        <p className="text-blue-200 text-sm">In Progress</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-purple-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats?.completed ?? 0}</p>
        <p className="text-blue-200 text-sm">Completed</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-amber-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Timer className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{notStartedCourses}</p>
        <p className="text-blue-200 text-sm">Not Started</p>
      </div>
    </div>
  );
};
