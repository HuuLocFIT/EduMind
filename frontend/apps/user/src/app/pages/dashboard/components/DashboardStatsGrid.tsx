import React from 'react';
import { BookOpen, TrendingUp, CheckCircle2, Timer } from 'lucide-react';

interface DashboardStats {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  notStarted: number;
}

interface DashboardStatsGridProps {
  stats: DashboardStats;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-blue-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <BookOpen className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats.totalCourses}</p>
        <p className="text-blue-200 text-sm">Total Courses</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-emerald-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <TrendingUp className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats.activeCourses}</p>
        <p className="text-blue-200 text-sm">In Progress</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-purple-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats.completedCourses}</p>
        <p className="text-blue-200 text-sm">Completed</p>
      </div>
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
        <div className="w-14 h-14 bg-amber-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Timer className="w-7 h-7" />
        </div>
        <p className="text-4xl font-bold">{stats.notStarted}</p>
        <p className="text-blue-200 text-sm">Not Started</p>
      </div>
    </div>
  );
};
