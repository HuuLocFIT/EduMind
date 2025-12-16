import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Trash2,
} from "lucide-react";
import { EnrollmentStatus } from "@edumind/shared-constants";
import { ProgressBar } from "@edumind/user-ui";
import { TeacherRouteHelpers } from "@edumind/shared-utils";
import type { EnrollmentResponse, PagedResponse } from "@edumind/shared-types";
import { StatusBadge } from "./StatusBadge";
import { CourseTypeBadge } from "./CourseTypeBadge";
import {
  formatDate,
  formatTimeAgo,
  isPaidCourse,
} from "../utils/students.utils";
import { Pagination } from "../../../../components/teacher/courses/list";
import type { SortKey, SortOrder } from "../types/students.types";

interface StudentsTableProps {
  enrollments: EnrollmentResponse[];
  pagination?: PagedResponse<EnrollmentResponse>["pagination"];
  sortBy: SortKey;
  sortOrder: SortOrder;
  updatingEnrollmentId: number | null;
  onSortChange: (key: SortKey) => void;
  onSuspendClick: (enrollment: EnrollmentResponse) => void;
  onActivate: (enrollment: EnrollmentResponse) => void;
  onUnenrollClick: (enrollment: EnrollmentResponse) => void;
  onPageChange: (page: number) => void;
}

export const StudentsTable: React.FC<StudentsTableProps> = ({
  enrollments,
  pagination,
  sortBy,
  sortOrder,
  updatingEnrollmentId,
  onSortChange,
  onSuspendClick,
  onActivate,
  onUnenrollClick,
  onPageChange,
}) => {
  const navigate = useNavigate();

  const totalElements = pagination?.totalElements ?? enrollments.length;
  const totalPages = pagination?.totalPages ?? 1;
  const currentPage = pagination?.page ?? 0;
  const pageSize = pagination?.size ?? 10;

  const SortButton: React.FC<{
    sortKey: SortKey;
    label: string;
  }> = ({ sortKey, label }) => (
    <button
      type="button"
      onClick={() => onSortChange(sortKey)}
      className="flex items-center gap-1 hover:text-gray-700"
    >
      {label}
      {sortBy === sortKey && (
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            sortOrder === "asc" ? "rotate-180" : ""
          }`}
        />
      )}
    </button>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {enrollments.length === 0 ? (
        <div className="p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No students found
          </h3>
          <p className="text-gray-600">
            There are no students matching the current filters.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton sortKey="progressPercentage" label="Progress" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton sortKey="enrolledAt" label="Enrolled" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <SortButton sortKey="lastAccessedAt" label="Last Access" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {enrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {e.studentName || `Student #${e.studentId}`}
                        </span>
                        {(e.studentEmail || e.studentId) && (
                          <span className="text-sm text-gray-500">
                            {e.studentEmail || `ID: ${e.studentId}`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Course */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(TeacherRouteHelpers.courseDetail(e.courseId))
                        }
                        className="flex items-center gap-2 text-left text-gray-900 hover:text-green-700"
                      >
                        {e.courseThumbnail ? (
                          <img
                            src={e.courseThumbnail}
                            alt={e.courseTitle}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="truncate max-w-[220px]">
                          {e.courseTitle}
                        </span>
                      </button>
                    </td>

                    {/* Course Type */}
                    <td className="px-4 py-3">
                      <CourseTypeBadge isPaid={isPaidCourse(e)} />
                    </td>

                    {/* Progress */}
                    <td className="px-4 py-3">
                      <div className="w-32">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {e.progressPercentage ?? 0}%
                          </span>
                          {e.completedLessons != null &&
                            e.totalLessons != null && (
                              <span className="text-xs text-gray-500">
                                {e.completedLessons}/{e.totalLessons}
                              </span>
                            )}
                        </div>
                        <ProgressBar
                          progress={e.progressPercentage ?? 0}
                          size="sm"
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>

                    {/* Enrolled */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(e.enrolledAt)}
                    </td>

                    {/* Last Access */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatTimeAgo(e.lastAccessedAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {updatingEnrollmentId === e.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            {e.status === EnrollmentStatus.SUSPENDED ? (
                              <button
                                type="button"
                                onClick={() => onActivate(e)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                                title="Reactivate student access to this course"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Activate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSuspendClick(e)}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                                  e.status === EnrollmentStatus.COMPLETED ||
                                  e.status === EnrollmentStatus.EXPIRED
                                    ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed opacity-60"
                                    : "border-amber-200 text-amber-700 hover:bg-amber-50"
                                }`}
                                disabled={
                                  e.status === EnrollmentStatus.COMPLETED ||
                                  e.status === EnrollmentStatus.EXPIRED
                                }
                                title={
                                  e.status === EnrollmentStatus.COMPLETED
                                    ? "Cannot suspend completed enrollments"
                                    : e.status === EnrollmentStatus.EXPIRED
                                    ? "Cannot suspend expired enrollments"
                                    : "Temporarily suspend student access (requires reason)"
                                }
                              >
                                <Ban className="w-3 h-3" />
                                Suspend
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onUnenrollClick(e)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                              title="Remove student from this course"
                            >
                              <Trash2 className="w-3 h-3" />
                              Unenroll
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && pagination && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {currentPage * pageSize + 1} to{" "}
                {Math.min(
                  (currentPage + 1) * pageSize,
                  totalElements || enrollments.length
                )}{" "}
                of {totalElements} students
              </p>
              <Pagination
                page={pagination.page}
                size={pagination.size}
                totalElements={pagination.totalElements}
                totalPages={pagination.totalPages}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
