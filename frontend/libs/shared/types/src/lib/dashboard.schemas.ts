import { z } from "zod";

export const MonthlyStatSchema = z.object({
  month: z.string(),
  count: z.number().int().nonnegative().nullable().optional(),
  amount: z.number().nonnegative().nullable().optional(),
});

export const CategoryStatSchema = z.object({
  categoryName: z.string(),
  courseCount: z.number().int().nonnegative(),
});

export const DashboardStatsSchema = z.object({
  // Enrollment
  totalEnrollments: z.number().int().nonnegative(),
  activeEnrollments: z.number().int().nonnegative(),
  completedEnrollments: z.number().int().nonnegative(),

  // Courses
  totalCourses: z.number().int().nonnegative(),
  publishedCourses: z.number().int().nonnegative(),
  pendingReviewCourses: z.number().int().nonnegative(),
  draftCourses: z.number().int().nonnegative(),
  archivedCourses: z.number().int().nonnegative(),

  // Revenue (from completed orders)
  totalRevenue: z.number().nonnegative(),
  revenueThisMonth: z.number().nonnegative(),
  revenueLastMonth: z.number().nonnegative(),

  // Pending items
  pendingEnrollmentReports: z.number().int().nonnegative(),
  pendingRefunds: z.number().int().nonnegative(),

  // Chart data (last 6 months)
  monthlyEnrollments: z.array(MonthlyStatSchema),
  monthlyRevenue: z.array(MonthlyStatSchema),
  coursesByCategory: z.array(CategoryStatSchema),
});

export type MonthlyStat = z.infer<typeof MonthlyStatSchema>;
export type CategoryStat = z.infer<typeof CategoryStatSchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
