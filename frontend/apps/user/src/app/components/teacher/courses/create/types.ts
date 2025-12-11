import type { CreateCourseRequest, CategoryResponse } from "@edumind/shared-types";

export interface StepProps {
  data: Partial<CreateCourseRequest>;
  onChange: (data: Partial<CreateCourseRequest>) => void;
  errors: Record<string, string>;
  categories: CategoryResponse[];
}

