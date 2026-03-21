import React from "react";
import { BookOpen, Calendar, Clock, Users } from "lucide-react";
import { Skeleton } from "@edumind/user-ui";
import type { StudentsStats as StudentsStatsType } from "../types/students.types";

interface StudentsStatsProps {
  stats: StudentsStatsType;
  loading: boolean;
}

export const StudentsStats: React.FC<StudentsStatsProps> = ({
  stats,
  loading,
}) => {
  if (loading) {
    return (
      <>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Total Students</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {stats.totalStudents}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <BookOpen className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {stats.activeStudents}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {stats.completedStudents}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500">Avg. Progress</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {stats.averageProgress}
              <span className="text-sm text-gray-500 ml-1">%</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
