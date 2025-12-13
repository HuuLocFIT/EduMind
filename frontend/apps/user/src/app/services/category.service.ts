import { apiClient } from "./api-client.service.js";
import {
  CategoryResponseSchema,
  type CategoryResponse,
  CategoryListResponseSchema,
  type CategoryListResponse,
} from "@edumind/shared-types";
import { CATEGORY_ENDPOINTS } from "@edumind/shared-utils";

export const categoryService = {
  async getActiveCategories(): Promise<CategoryListResponse> {
    const response = await apiClient.get<CategoryListResponse>(
      CATEGORY_ENDPOINTS.ACTIVE
    );
    return CategoryListResponseSchema.parse(response.data);
  },

  async getCategoriesWithCourses(): Promise<CategoryListResponse> {
    const response = await apiClient.get<CategoryListResponse>(
      CATEGORY_ENDPOINTS.WITH_COURSES
    );
    return CategoryListResponseSchema.parse(response.data);
  },

  async getCategoryById(categoryId: number | string): Promise<CategoryResponse> {
    const response = await apiClient.get<CategoryResponse>(
      CATEGORY_ENDPOINTS.DETAIL(categoryId)
    );
    return CategoryResponseSchema.parse(response.data);
  },
};

export type CategoryService = typeof categoryService;

