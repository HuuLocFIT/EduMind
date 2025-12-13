import { z } from "zod";
import { LessonResponseSchema } from "./lesson.schemas";

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
  lessonCount: z.number().optional().nullable(),
  totalDurationMinutes: z.number().optional().nullable(),
  lessons: z.array(z.lazy(() => LessonResponseSchema)).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ReorderSectionsRequestSchema = z.object({
  sectionIds: z
    .array(z.number().int().positive())
    .min(1, "Section IDs are required"),
});

export const SectionListResponseSchema = z.array(SectionResponseSchema);

export const SectionDetailListResponseSchema = z.array(SectionDetailResponseSchema);

export type CreateSectionRequest = z.infer<typeof CreateSectionRequestSchema>;
export type UpdateSectionRequest = z.infer<typeof UpdateSectionRequestSchema>;
export type SectionResponse = z.infer<typeof SectionResponseSchema>;
export type SectionDetailResponse = z.infer<typeof SectionDetailResponseSchema>;
export type ReorderSectionsRequest = z.infer<
  typeof ReorderSectionsRequestSchema
>;
export type SectionListResponse = z.infer<typeof SectionListResponseSchema>;
export type SectionDetailListResponse = z.infer<typeof SectionDetailListResponseSchema>;