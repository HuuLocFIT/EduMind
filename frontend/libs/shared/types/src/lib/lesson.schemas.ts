import { z } from "zod";
import { ContentType, VideoUploadStatus } from "@edumind/shared-constants";

export const ContentTypeSchema = z.nativeEnum(ContentType);
export const VideoUploadStatusSchema = z.nativeEnum(VideoUploadStatus);

export const LessonResourceSchema = z.object({
  title: z.string().min(1, "Resource title is required"),
  url: z.string().url("Invalid resource URL"),
  type: z.string().min(1, "Resource type is required"),
});

export const ReorderLessonsRequestSchema = z.object({
  lessonIds: z
    .array(z.number().int().positive())
    .min(1, "Lesson IDs are required"),
});

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
  videoUploadStatus: VideoUploadStatusSchema.nullable().optional().default("NONE"),
  videoPublicId: z.string().nullable().optional(),
  articleContent: z.string().nullable().optional(),
  resources: z.array(LessonResourceSchema).optional().nullable(),
  orderIndex: z.number(),
  isPreview: z.boolean(),
  isMandatory: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LessonListResponseSchema = z.array(LessonResponseSchema);

export type LessonResource = z.infer<typeof LessonResourceSchema>;
export type ReorderLessonsRequest = z.infer<typeof ReorderLessonsRequestSchema>;
export type CreateLessonRequest = z.infer<typeof CreateLessonRequestSchema>;
export type UpdateLessonRequest = z.infer<typeof UpdateLessonRequestSchema>;
export type LessonResponse = z.infer<typeof LessonResponseSchema>;
export type LessonListResponse = z.infer<typeof LessonListResponseSchema>;

// Video upload schemas
export const VideoSignatureResponseSchema = z.object({
  cloudName: z.string(),
  apiKey: z.string(),
  signature: z.string(),
  timestamp: z.number(),
  folder: z.string(),
});

export const ConfirmVideoUploadRequestSchema = z.object({
  cloudinaryUrl: z.string().url(),
  publicId: z.string(),
  duration: z.number().nonnegative().optional().nullable(),
});

export type VideoSignatureResponse = z.infer<typeof VideoSignatureResponseSchema>;
export type ConfirmVideoUploadRequest = z.infer<typeof ConfirmVideoUploadRequestSchema>;