import { z } from "zod";

// ==================== Request Schemas ====================

export const AddToCartRequestSchema = z.object({
  courseId: z.number().int().positive("Course ID is required"),
});

// ==================== Response Schemas ====================

export const CartItemResponseSchema = z.object({
  id: z.number().nullable().optional(),
  courseId: z.number(),

  // Course details
  courseTitle: z.string(),
  courseSlug: z.string(),
  courseThumbnailUrl: z.string().nullable().optional(),
  instructorName: z.string(),
  instructorId: z.number(),

  // Pricing
  originalPrice: z.number(),
  discountAmount: z.number().nullable().optional(),
  effectivePrice: z.number(),
  currency: z.string(),

  // Course meta
  level: z.string().nullable().optional(),
  totalLessons: z.number().nullable().optional(),
  averageRating: z.number().nullable().optional(),
  totalReviews: z.number().nullable().optional(),

  addedAt: z.string(),
});

export const CartResponseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  items: z.array(CartItemResponseSchema),
  itemCount: z.number(),
  subtotal: z.number(),
  discountTotal: z.number(),
  totalAmount: z.number(),
  currency: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ==================== Types ====================

export type AddToCartRequest = z.infer<typeof AddToCartRequestSchema>;
export type CartItemResponse = z.infer<typeof CartItemResponseSchema>;
export type CartResponse = z.infer<typeof CartResponseSchema>;
