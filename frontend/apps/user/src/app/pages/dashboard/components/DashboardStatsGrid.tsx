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
  isLoading?: boolean;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ stats, isLoading = false }) => {
  const statItems = [
    { icon: BookOpen, color: 'bg-blue-500/30', value: stats.totalCourses, label: 'Total Courses' },
    { icon: TrendingUp, color: 'bg-emerald-500/30', value: stats.activeCourses, label: 'In Progress' },
    { icon: CheckCircle2, color: 'bg-purple-500/30', value: stats.completedCourses, label: 'Completed' },
    { icon: Timer, color: 'bg-amber-500/30', value: stats.notStarted, label: 'Not Started' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {statItems.map(({ icon: Icon, color, value, label }) => (
        <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 text-center hover:bg-white/20 transition-colors group cursor-pointer">
          <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
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
