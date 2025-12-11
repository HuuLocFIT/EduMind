import { CourseStatus } from "@edumind/shared-constants";

export type ViewMode = "grid" | "list";
export type StatusFilter = "ALL" | keyof typeof CourseStatus;

export interface FilterState {
  status: StatusFilter;
  search: string;
}

