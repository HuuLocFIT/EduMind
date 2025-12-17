import { z } from "zod";
import { CourseLevelSchema } from "./course.schemas.js";
import { createPagedResponseSchema } from "./base-response.schemas.js";

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

export const WishlistPagedResponseSchema = createPagedResponseSchema(
  WishlistItemResponseSchema
);

export const WishlistListSchema = z.array(WishlistItemResponseSchema);

export type WishlistItemResponse = z.infer<typeof WishlistItemResponseSchema>;
export type WishlistPagedResponse = z.infer<typeof WishlistPagedResponseSchema>;
export type WishlistListResponse = z.infer<typeof WishlistListSchema>;