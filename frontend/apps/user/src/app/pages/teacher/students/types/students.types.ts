import { EnrollmentStatus } from "@edumind/shared-constants";
import type {
  CourseResponse,
  EnrollmentResponse,
  PagedResponse,
} from "@edumind/shared-types";

export type SortKey = "enrolledAt" | "lastAccessedAt" | "progressPercentage";
export type SortOrder = "asc" | "desc";

export interface StudentsStats {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  averageProgress: number;
}

export interface CourseStudentsPageState {
  enrollments: EnrollmentResponse[];
  pagination: PagedResponse<EnrollmentResponse>["pagination"];
}

export interface StudentsFilters {
  courseId?: number;
  status?: keyof typeof EnrollmentStatus | "";
  search?: string;
  sortBy: SortKey;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
}

