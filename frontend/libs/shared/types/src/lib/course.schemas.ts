import { z } from "zod";
import {
  ContentType,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
} from "@edumind/shared-constants";

// ============================================================================
// ENUMS
// ============================================================================

export const ContentTypeSchema = z.nativeEnum(ContentType);
export const CourseLevelSchema = z.nativeEnum(CourseLevel);
export const CourseStatusSchema = z.nativeEnum(CourseStatus);
export const EnrollmentStatusSchema = z.nativeEnum(EnrollmentStatus);

// ============================================================================
// LESSON RESOURCE
// ============================================================================

export const LessonResourceSchema = z.object({
  title: z.string().min(1, "Resource title is required"),
  url: z.string().url("Invalid resource URL"),
  type: z.string().min(1, "Resource type is required"),
});

export type LessonResource = z.infer<typeof LessonResourceSchema>;

// ============================================================================
// SECTION SCHEMAS
// ============================================================================

export const CreateSectionRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Section title is required")
    .max(255, "Section title must not exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Section description must not exceed 2000 characters")
    .optional()
    .nullable(),
});

export const UpdateSectionRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Section title is required")
    .max(255, "Section title must not exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Section description must not exceed 2000 characters")
    .optional()
    .nullable(),
});

export const SectionResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  orderIndex: z.number(),
  lessonCount: z.number(),
  totalDurationMinutes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const SectionDetailResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  orderIndex: z.number(),
  lessons: z.array(z.lazy(() => LessonResponseSchema)).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateSectionRequest = z.infer<typeof CreateSectionRequestSchema>;
export type UpdateSectionRequest = z.infer<typeof UpdateSectionRequestSchema>;
export type SectionResponse = z.infer<typeof SectionResponseSchema>;
export type SectionDetailResponse = z.infer<typeof SectionDetailResponseSchema>;

export const ReorderLessonsRequestSchema = z.object({
  lessonIds: z
    .array(z.number().int().positive())
    .min(1, "Lesson IDs are required"),
});

export const ReorderSectionsRequestSchema = z.object({
  sectionIds: z
    .array(z.number().int().positive())
    .min(1, "Section IDs are required"),
});

export type ReorderLessonsRequest = z.infer<typeof ReorderLessonsRequestSchema>;
export type ReorderSectionsRequest = z.infer<
  typeof ReorderSectionsRequestSchema
>;

// ============================================================================
// LESSON SCHEMAS
// ============================================================================

export const CreateLessonRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Lesson title is required")
    .max(255, "Lesson title must not exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Lesson description must not exceed 2000 characters")
    .optional()
    .nullable(),
  contentType: ContentTypeSchema,
  videoUrl: z.string().url("Invalid video URL").optional().nullable(),
  videoDuration: z
    .number()
    .int()
    .nonnegative("Video duration must be non-negative")
    .optional()
    .nullable(),
  articleContent: z.string().optional().nullable(),
  resources: z.array(LessonResourceSchema).optional().nullable(),
  isPreview: z.boolean().default(false).optional(),
  isMandatory: z.boolean().default(true).optional(),
});

export const UpdateLessonRequestSchema = z.object({
  title: z
    .string()
    .min(1, "Lesson title is required")
    .max(255, "Lesson title must not exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Lesson description must not exceed 2000 characters")
    .optional()
    .nullable(),
  contentType: ContentTypeSchema.optional(),
  videoUrl: z.string().url("Invalid video URL").optional().nullable(),
  videoDuration: z
    .number()
    .int()
    .nonnegative("Video duration must be non-negative")
    .optional()
    .nullable(),
  articleContent: z.string().optional().nullable(),
  resources: z.array(LessonResourceSchema).optional().nullable(),
  isPreview: z.boolean().optional().nullable(),
  isMandatory: z.boolean().optional().nullable(),
});

export const LessonResponseSchema = z.object({
  id: z.number(),
  sectionId: z.number(),
  courseId: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  contentType: ContentTypeSchema,
  videoUrl: z.string().nullable().optional(),
  videoDuration: z.number().nullable().optional(),
  articleContent: z.string().nullable().optional(),
  resources: z.array(LessonResourceSchema).optional().nullable(),
  orderIndex: z.number(),
  isPreview: z.boolean(),
  isMandatory: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateLessonRequest = z.infer<typeof CreateLessonRequestSchema>;
export type UpdateLessonRequest = z.infer<typeof UpdateLessonRequestSchema>;
export type LessonResponse = z.infer<typeof LessonResponseSchema>;

// ============================================================================
// CATEGORY SCHEMAS
// ============================================================================

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
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;

// Category schema for CourseDetailResponse (without courseCount requirement)
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
export type CategoryInCourse = z.infer<typeof CategoryInCourseSchema>;

// ============================================================================
// COURSE SCHEMAS
// ============================================================================

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
  durationHours: z
    .number()
    .int()
    .nonnegative("Duration must be non-negative")
    .optional()
    .nullable(),
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
  durationHours: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .nullable(),
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
  hasCertificate: z.boolean(),
  hasSubtitles: z.boolean(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  totalLessons: z.number().nullable().optional(),
  totalStudents: z.number().nullable().optional(),
  averageRating: z.number().nullable().optional(),
  totalReviews: z.number().nullable().optional(),
  sections: z.array(z.lazy(() => SectionResponseSchema)).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateCourseRequest = z.infer<typeof CreateCourseRequestSchema>;
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequestSchema>;
export type CourseResponse = z.infer<typeof CourseResponseSchema>;
export type CourseDetailResponse = z.infer<typeof CourseDetailResponseSchema>;

// ============================================================================
// INSTRUCTOR SCHEMAS
// ============================================================================

export const InstructorStatsResponseSchema = z.object({
  instructorId: z.number(),
  instructorName: z.string(),
  bio: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  totalCourses: z.number().int().nonnegative().nullable().optional(),
  totalStudents: z.number().int().nonnegative().nullable().optional(),
  averageRating: z.number().nullable().optional(),
  totalReviews: z.number().int().nonnegative().nullable().optional(),
});

export type InstructorStatsResponse = z.infer<
  typeof InstructorStatsResponseSchema
>;

// ============================================================================
// ENROLLMENT SCHEMAS
// ============================================================================

export const EnrollRequestSchema = z.object({
  courseId: z.number().int().positive("Course ID is required"),
});

export const EnrollmentResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  courseThumbnail: z.string().optional().nullable(),
  studentId: z.number(),
  progressPercentage: z.number().nullable().optional(),
  completedLessons: z.number().nullable().optional(),
  totalLessons: z.number().nullable().optional(),
  status: EnrollmentStatusSchema,
  enrolledAt: z.string(),
  completedAt: z.string().nullable().optional(),
  certificateUrl: z.string().optional().nullable(),
  lastAccessedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export type EnrollRequest = z.infer<typeof EnrollRequestSchema>;
export type EnrollmentResponse = z.infer<typeof EnrollmentResponseSchema>;

// ============================================================================
// LESSON PROGRESS SCHEMAS
// ============================================================================

export const UpdateProgressRequestSchema = z.object({
  enrollmentId: z.number().int().positive("Enrollment ID is required"),
  lessonId: z.number().int().positive("Lesson ID is required"),
  watchDuration: z
    .number()
    .int()
    .nonnegative("Watched duration must be non-negative")
    .optional(),
  lastPosition: z
    .number()
    .int()
    .nonnegative("Last position must be non-negative")
    .optional(),
});

export const LessonProgressResponseSchema = z.object({
  id: z.number(),
  enrollmentId: z.number(),
  lessonId: z.number(),
  lessonTitle: z.string(),
  studentId: z.number(),
  isCompleted: z.boolean(),
  completedAt: z.string().nullable().optional(),
  watchDuration: z.number().nullable().optional(),
  lastPosition: z.number().nullable().optional(),
  watchPercentage: z.number().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  updatedAt: z.string(),
});

export type UpdateProgressRequest = z.infer<typeof UpdateProgressRequestSchema>;
export type LessonProgressResponse = z.infer<
  typeof LessonProgressResponseSchema
>;

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const CreateReviewRequestSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment must not exceed 1000 characters"),
});

export const UpdateReviewRequestSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must not exceed 5"),
  comment: z
    .string()
    .min(10, "Comment must be at least 10 characters")
    .max(1000, "Comment must not exceed 1000 characters"),
});

export const ReviewResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  studentId: z.number(),
  studentName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  rating: z.number(),
  comment: z.string().nullable().optional(),
  isApproved: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>;
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

// ============================================================================
// WISHLIST SCHEMAS
// ============================================================================

export const WishlistItemResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),
  courseTitle: z.string(),
  courseSlug: z.string(),
  thumbnailUrl: z.string().optional().nullable(),
  price: z.number(),
  discountPrice: z.number().nullable().optional(),
  level: CourseLevelSchema,
  instructorId: z.number(),
  instructorName: z.string(),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  addedAt: z.string(),
});

export type WishlistItemResponse = z.infer<typeof WishlistItemResponseSchema>;

// ============================================================================
// RATING DISTRIBUTION SCHEMAS
// ============================================================================

export const RatingDistributionResponseSchema = z.object({
  courseId: z.number(),
  averageRating: z.number(),
  totalReviews: z.number(),
  distribution: z.record(z.string(), z.number()),
});

export type RatingDistributionResponse = z.infer<typeof RatingDistributionResponseSchema>;
