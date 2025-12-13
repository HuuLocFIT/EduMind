import { z } from "zod";

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

export const LessonProgressListSchema = z.array(LessonProgressResponseSchema);

export type UpdateProgressRequest = z.infer<typeof UpdateProgressRequestSchema>;
export type LessonProgressResponse = z.infer<
  typeof LessonProgressResponseSchema
>;
export type LessonProgressListResponse = z.infer<typeof LessonProgressListSchema>;