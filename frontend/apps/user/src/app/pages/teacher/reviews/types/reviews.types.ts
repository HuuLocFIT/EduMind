export type FilterTab = "all" | "replied" | "unreplied";

export interface ReviewFilters {
  page: number;
  size: number;
  courseId?: number;
  rating?: number;
  hasReply?: boolean;
  sortBy: "createdAt" | "rating" | "updatedAt";
  sortDir: "asc" | "desc";
}

export interface ReviewModalState {
  isOpen: boolean;
  reviewId: number | null;
  mode: "create" | "edit";
}

export interface DeleteModalState {
  isOpen: boolean;
  reviewId: number | null;
}

