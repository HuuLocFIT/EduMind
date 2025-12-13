import { z } from "zod";

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
