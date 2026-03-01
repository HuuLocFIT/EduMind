import { z } from "zod";
import { MonthlyStatSchema } from "./dashboard.schemas";

export const EnrollmentStatusStatSchema = z.object({
  status: z.string(),
  count: z.number().int().nonnegative(),
});

export const RatingDistributionStatSchema = z.object({
  stars: z.number().int().min(1).max(5),
  count: z.number().int().nonnegative(),
});

export const TeacherCourseStatSchema = z.object({
  courseId: z.number().int().positive(),
  title: z.string(),
  totalStudents: z.number().int().nonnegative(),
  averageRating: z.number().nonnegative(),
  netEarnings: z.number().nonnegative(),
  completionRate: z.number().min(0).max(100),
  status: z.string(),
});

export const TeacherAnalyticsSchema = z.object({
  totalPublishedCourses: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  averageRating: z.number().nonnegative(),
  totalReviews: z.number().int().nonnegative(),
  totalNetEarnings: z.number().nonnegative(),
  completionRate: z.number().min(0).max(100),
  monthlyEnrollments: z.array(MonthlyStatSchema),
  monthlyEarnings: z.array(MonthlyStatSchema),
  enrollmentStatusBreakdown: z.array(EnrollmentStatusStatSchema),
  ratingDistribution: z.array(RatingDistributionStatSchema),
  topCourses: z.array(TeacherCourseStatSchema),
});

export type EnrollmentStatusStat = z.infer<typeof EnrollmentStatusStatSchema>;
export type RatingDistributionStat = z.infer<typeof RatingDistributionStatSchema>;
export type TeacherCourseStat = z.infer<typeof TeacherCourseStatSchema>;
export type TeacherAnalytics = z.infer<typeof TeacherAnalyticsSchema>;
