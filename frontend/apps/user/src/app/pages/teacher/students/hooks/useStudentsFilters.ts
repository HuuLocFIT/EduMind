import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EnrollmentStatus } from "@edumind/shared-constants";
import type { EnrollmentResponse } from "@edumind/shared-types";
import type { SortKey, SortOrder, StudentsStats } from "../types/students.types";

export const useStudentsFilters = (
  enrollments: EnrollmentResponse[]
) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const courseIdParam = searchParams.get("courseId");
  const currentPage = Number(searchParams.get("page") || "0");
  const pageSize = Number(searchParams.get("size") || "10");
  const statusFilter = searchParams.get("status") as
    | keyof typeof EnrollmentStatus
    | ""
    | null;
  const searchQuery = searchParams.get("search") || "";
  const sortBy = (searchParams.get("sortBy") as SortKey) || "enrolledAt";
  const sortOrder = (searchParams.get("sortOrder") as SortOrder) || "desc";

  const selectedCourseId = courseIdParam ? Number(courseIdParam) : undefined;

  const updateFilters = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });

    // Reset page when filters change (unless page explicitly set)
    if (!("page" in updates)) {
      next.set("page", "0");
    }

    setSearchParams(next);
  };

  const filteredAndSorted = useMemo(() => {
    let rows = [...enrollments];

    if (statusFilter) {
      rows = rows.filter((e) => e.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((e) => {
        const idMatch = String(e.studentId).includes(q);
        const nameMatch = (e.studentName || "").toLowerCase().includes(q);
        const emailMatch = (e.studentEmail || "").toLowerCase().includes(q);
        return idMatch || nameMatch || emailMatch;
      });
    }

    rows.sort((a, b) => {
      const dir = sortOrder === "asc" ? 1 : -1;

      if (sortBy === "progressPercentage") {
        const pa = a.progressPercentage ?? 0;
        const pb = b.progressPercentage ?? 0;
        return (pa - pb) * dir;
      }

      if (sortBy === "enrolledAt") {
        return (
          (new Date(a.enrolledAt).getTime() -
            new Date(b.enrolledAt).getTime()) *
          dir
        );
      }

      if (sortBy === "lastAccessedAt") {
        const ta = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
        const tb = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
        return (ta - tb) * dir;
      }

      return 0;
    });

    return rows;
  }, [enrollments, statusFilter, searchQuery, sortBy, sortOrder]);

  const stats: StudentsStats = useMemo(() => {
    const totalStudents = filteredAndSorted.length;
    const activeStudents = filteredAndSorted.filter(
      (e) => e.status === EnrollmentStatus.ACTIVE
    ).length;
    const completedStudents = filteredAndSorted.filter(
      (e) => e.status === EnrollmentStatus.COMPLETED
    ).length;

    const progressValues = filteredAndSorted
      .map((e) => e.progressPercentage ?? 0)
      .filter((v) => v > 0);
    const averageProgress =
      progressValues.length === 0
        ? 0
        : Math.round(
            progressValues.reduce((sum, v) => sum + v, 0) /
              progressValues.length
          );

    return {
      totalStudents,
      activeStudents,
      completedStudents,
      averageProgress,
    };
  }, [filteredAndSorted]);

  return {
    filters: {
      courseId: selectedCourseId,
      status: statusFilter || undefined,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
      page: currentPage,
      pageSize,
    },
    filteredAndSorted,
    stats,
    updateFilters,
  };
};

