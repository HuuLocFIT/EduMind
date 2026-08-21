import { z } from "zod";
import { CourseLevel, CourseStatus } from "@edumind/shared-constants";
import { SectionDetailResponseSchema } from "./section.schemas.js";
import { CategoryInCourseSchema } from "./course-category.schemas.js";
import { createPagedResponseSchema } from "./base-response.schemas.js";

export const CourseLevelSchema = z.nativeEnum(CourseLevel);
export const CourseStatusSchema = z.nativeEnum(CourseStatus);

export const CreateCourseRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must not exceed 255 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
    .max(255, "Slug must not exceed 255 characters"),
  description: z.string().min(1, "Description is required"),
  shortDescription: z
    .string()
    .max(500, "Short description must not exceed 500 characters")
    .optional()
    .nullable(),
  categoryId: z.number().int().positive("Category is required"),
  price: z
    .number()
    .nonnegative("Price must be non-negative")
    .or(z.string().transform((val) => parseFloat(val))),
  discountPrice: z
    .number()
    .nonnegative("Discount price must be non-negative")
    .optional()
    .nullable()
    .or(z.string().transform((val) => parseFloat(val))),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "Currency must be 3-letter ISO code (e.g., USD)")
    .default("USD"),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().nullable(),
  previewVideoUrl: z
    .string()
    .url("Invalid preview video URL")
    .optional()
    .nullable(),
  level: CourseLevelSchema,
  language: z.string().default("en").optional(),
  hasCertificate: z.boolean().default(false).optional(),
  hasSubtitles: z.boolean().default(false).optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
});

export const UpdateCourseRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must not exceed 255 characters")
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
    .max(255, "Slug must not exceed 255 characters")
    .optional(),
  description: z.string().optional(),
  shortDescription: z
    .string()
    .max(500, "Short description must not exceed 500 characters")
    .optional()
    .nullable(),
  categoryId: z.number().int().positive().optional(),
  price: z
    .number()
    .nonnegative()
    .optional()
    .or(z.string().transform((val) => parseFloat(val))),
  discountPrice: z
    .number()
    .nonnegative()
    .optional()
    .nullable()
    .or(z.string().transform((val) => parseFloat(val))),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "Currency must be 3-letter ISO code")
    .optional(),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional().nullable(),
  previewVideoUrl: z
    .string()
    .url("Invalid preview video URL")
    .optional()
    .nullable(),
  level: CourseLevelSchema.optional(),
  language: z.string().optional(),
  hasCertificate: z.boolean().optional(),
  hasSubtitles: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
});

export const CourseResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  shortDescription: z.string().nullable().optional(),
  instructorId: z.number(),
  instructorName: z.string(),
  categoryId: z.number(),
  categoryName: z.string(),
  price: z.number(),
  currency: z.string(),
  discountPrice: z.number().nullable().optional(),
  effectivePrice: z.number().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  previewVideoUrl: z.string().nullable().optional(),
  level: CourseLevelSchema,
  language: z.string(),
  durationHours: z.number().nullable().optional(),
  status: CourseStatusSchema,
  publishedAt: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  archivedBy: z.number().nullable().optional(),
  archiveReason: z.string().nullable().optional(),
  hasCertificate: z.boolean(),
  hasSubtitles: z.boolean(),
  totalLessons: z.number().nullable().optional(),
  totalStudents: z.number().nullable().optional(),
  averageRating: z.number().nullable().optional(),
  totalReviews: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CourseDetailResponseSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  shortDescription: z.string().nullable().optional(),
  instructorId: z.number(),
  instructorName: z.string(),
  category: CategoryInCourseSchema.optional().nullable(),
  price: z.number(),
  currency: z.string(),
  discountPrice: z.number().nullable().optional(),
  effectivePrice: z.number().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  previewVideoUrl: z.string().nullable().optional(),
  level: CourseLevelSchema,
  language: z.string(),
  durationHours: z.number().nullable().optional(),
  status: CourseStatusSchema,
  publishedAt: z.string().nullable().optional(),
  archivedAt: z.string().nullable().optional(),
  archivedBy: z.number().nullable().optional(),
  archiveReason: z.string().nullable().optional(),
  hasCertificate: z.boolean(),
  hasSubtitles: z.boolean(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  totalLessons: z.number().nullable().optional(),
  totalStudents: z.number().nullable().optional(),
  averageRating: z.number().nullable().optional(),
  totalReviews: z.number().nullable().optional(),
  sections: z.array(z.lazy(() => SectionDetailResponseSchema)).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CoursePagedResponseSchema =
  createPagedResponseSchema(CourseResponseSchema);

export type CreateCourseRequest = z.infer<typeof CreateCourseRequestSchema>;
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequestSchema>;
export type CourseResponse = z.infer<typeof CourseResponseSchema>;
export type CourseDetailResponse = z.infer<typeof CourseDetailResponseSchema>;
export type CoursePagedResponse = z.infer<typeof CoursePagedResponseSchema>;
