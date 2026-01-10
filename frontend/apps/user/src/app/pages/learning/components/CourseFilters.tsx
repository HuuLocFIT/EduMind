import React from 'react';
import type { EnrollmentStatsResponse } from '@edumind/shared-types';

export type FilterStatus = 'all' | 'active' | 'completed';

interface CourseFiltersProps {
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  stats: EnrollmentStatsResponse | undefined;
}

export const CourseFilters: React.FC<CourseFiltersProps> = ({
  activeFilter,
  onFilterChange,
  stats,
}) => {
  const tabs = [
    { key: 'all' as const, label: 'All', count: stats?.total ?? 0 },
    { key: 'active' as const, label: 'Active', count: stats?.active ?? 0 },
    { key: 'completed' as const, label: 'Completed', count: stats?.completed ?? 0 },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
        <p className="text-slate-500 text-sm mt-1">Pick up where you left off</p>
      </div>
      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeFilter === tab.key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeFilter === tab.key ? 'bg-white/20' : 'bg-slate-200'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
