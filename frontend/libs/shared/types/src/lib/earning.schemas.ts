import { z } from "zod";
import { EarningStatus } from "@edumind/shared-constants";
import { createPagedResponseSchema } from "./base-response.schemas.js";

// ==================== Enum Schemas ====================

export const EarningStatusSchema = z.nativeEnum(EarningStatus);

// ==================== Response Schemas ====================

export const EarningResponseSchema = z.object({
  id: z.number(),
  instructorId: z.number(),
  orderId: z.number(),
  orderNumber: z.string(),
  courseId: z.number(),

  // Course info
  courseTitle: z.string(),
  courseThumbnailUrl: z.string().nullable().optional(),

  // Buyer info (anonymized)
  buyerName: z.string(),

  // Amounts
  grossAmount: z.number(),
  platformFeePercent: z.number(),
  platformFeeAmount: z.number(),
  netAmount: z.number(),
  currency: z.string(),

  // Status
  status: EarningStatusSchema,

  // Payout info
  payoutId: z.number().nullable().optional(),
  paidAt: z.string().nullable().optional(),

  // Timestamps
  createdAt: z.string(),
});

export const MonthlyEarningResponseSchema = z.object({
  year: z.number(),
  month: z.number(),
  monthName: z.string(),
  grossEarnings: z.number(),
  netEarnings: z.number(),
  platformFees: z.number(),
  salesCount: z.number(),
  currency: z.string(),
});

export const CourseEarningResponseSchema = z.object({
  courseId: z.number(),
  courseTitle: z.string(),
  courseThumbnailUrl: z.string().nullable().optional(),
  totalGrossEarnings: z.number(),
  totalNetEarnings: z.number(),
  salesCount: z.number(),
  averageSalePrice: z.number(),
  currency: z.string(),
});

export const EarningsSummaryResponseSchema = z.object({
  instructorId: z.number(),

  // Totals
  totalGrossEarnings: z.number(),
  totalNetEarnings: z.number(),
  totalPlatformFees: z.number(),

  // By status
  pendingEarnings: z.number(),
  availableEarnings: z.number(),
  paidEarnings: z.number(),

  // Current period (this month)
  currentMonthGross: z.number(),
  currentMonthNet: z.number(),
  currentMonthSales: z.number(),

  // Previous period (last month)
  previousMonthGross: z.number(),
  previousMonthNet: z.number(),
  previousMonthSales: z.number(),

  // Growth
  monthOverMonthGrowthPercent: z.number(),

  // Stats
  totalSales: z.number(),
  totalCoursesSold: z.number(),

  // Top performing courses
  topCourses: z.array(CourseEarningResponseSchema).optional(),

  currency: z.string(),
});

// ==================== Paged Response ====================

export const EarningPagedResponseSchema = createPagedResponseSchema(
  EarningResponseSchema
);

// ==================== Types ====================

export type EarningResponse = z.infer<typeof EarningResponseSchema>;
export type MonthlyEarningResponse = z.infer<
  typeof MonthlyEarningResponseSchema
>;
export type CourseEarningResponse = z.infer<typeof CourseEarningResponseSchema>;
export type EarningsSummaryResponse = z.infer<
  typeof EarningsSummaryResponseSchema
>;
export type EarningPagedResponse = z.infer<typeof EarningPagedResponseSchema>;
