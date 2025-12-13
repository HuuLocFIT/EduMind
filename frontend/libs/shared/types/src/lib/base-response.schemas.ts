import { ZodTypeAny, z } from "zod";

export const ApiErrorSchema = z.object({
  message: z.string(),
  status: z.number(),
  timestamp: z.string(),
  path: z.string().optional(),
  errorCode: z.string().optional(),
  error: z.string().optional(),
});

// Generic ApiResponse helpers & schemas
export const ApiResponseBaseSchema = z.object({
  status: z.number(),
  success: z.boolean(),
  message: z.string().optional(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
  path: z.string().optional(),
});

export const createApiResponseSchema = <T extends ZodTypeAny>(dataSchema?: T) =>
  ApiResponseBaseSchema.extend({
    data: dataSchema ? dataSchema.optional() : z.any().optional(),
  });

export const PaginationMetadataSchema = z.object({
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  hasNext: z.boolean().optional(),
  hasPrevious: z.boolean().optional(),
});

export const createPagedResponseSchema = <T extends ZodTypeAny>(
  itemSchema: T
) =>
  createApiResponseSchema(z.array(itemSchema)).extend({
    pagination: PaginationMetadataSchema.optional(),
});

export const MessageResponseSchema = z.object({
  message: z.string(),
  status: z.number().optional(),
  success: z.boolean().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;

export interface ApiResponse<T = unknown> {
  status: number;
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
  requestId?: string;
  path?: string;
}
export interface PagedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: PaginationMetadata;
}