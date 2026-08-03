import React from 'react';
import type { EnrollmentStatsResponse } from '@edumind/shared-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@edumind/user-ui';

export type FilterStatus = 'all' | 'active' | 'completed';

interface CourseFiltersProps {
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  stats: EnrollmentStatsResponse | undefined;
  children: React.ReactNode;
}

export const CourseFilters: React.FC<CourseFiltersProps> = ({
  activeFilter,
  onFilterChange,
  stats,
  children,
}) => {
  const tabs = [
    { key: 'all' as const, label: 'All', count: stats?.total ?? 0 },
    { key: 'active' as const, label: 'Active', count: stats?.active ?? 0 },
    { key: 'completed' as const, label: 'Completed', count: stats?.completed ?? 0 },
  ];

  return (
    <Tabs value={activeFilter} defaultValue="all" onValueChange={(value) => onFilterChange(value as FilterStatus)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
        <h2 id="my-courses-heading" className="text-2xl font-bold text-slate-900">My Courses</h2>
        <p className="text-slate-500 text-sm mt-1">Pick up where you left off</p>
        </div>
      <TabsList
        aria-labelledby="my-courses-heading"
        className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-slate-200"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            aria-label={`${tab.label}, ${tab.count} ${tab.count === 1 ? 'course' : 'courses'}`}
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
          </TabsTrigger>
        ))}
      </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent key={tab.key} value={tab.key} className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          {activeFilter === tab.key ? children : null}
        </TabsContent>
      ))}
    </Tabs>
  );
};
