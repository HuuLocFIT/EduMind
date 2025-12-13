import { z } from "zod";

export const CreateCategoryRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must not exceed 100 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
    .max(100, "Slug must not exceed 100 characters"),
  description: z.string().optional().nullable(),
  iconUrl: z.string().optional().nullable(),
});

export const UpdateCategoryRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must not exceed 100 characters")
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
    .max(100, "Slug must not exceed 100 characters")
    .optional(),
  description: z.string().optional().nullable(),
  iconUrl: z.string().optional().nullable(),
});

export const CategoryResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  courseCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CategoryListResponseSchema = z.array(CategoryResponseSchema);

export const CategoryInCourseSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  iconUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  courseCount: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;
export type CategoryInCourse = z.infer<typeof CategoryInCourseSchema>;
