import { apiClient } from "./api-client.service.js";
import { z } from "zod";
import {
  CategoryResponseSchema,
  type CategoryResponse,
} from "@edumind/shared-types";
import { CATEGORY_ENDPOINTS } from "@edumind/shared-utils";

const CategoryListSchema = z.array(CategoryResponseSchema);

export const categoryService = {
  async getActiveCategories(): Promise<CategoryResponse[]> {
    const response = await apiClient.get<CategoryResponse[]>(
      CATEGORY_ENDPOINTS.ACTIVE
    );
    return CategoryListSchema.parse(response.data);
  },

  async getCategoriesWithCourses(): Promise<CategoryResponse[]> {
    const response = await apiClient.get<CategoryResponse[]>(
      CATEGORY_ENDPOINTS.WITH_COURSES
    );
    return CategoryListSchema.parse(response.data);
  },

  async getCategoryById(categoryId: number | string): Promise<CategoryResponse> {
    const response = await apiClient.get<CategoryResponse>(
      CATEGORY_ENDPOINTS.DETAIL(categoryId)
    );
    return CategoryResponseSchema.parse(response.data);
  },
};

export type CategoryService = typeof categoryService;

