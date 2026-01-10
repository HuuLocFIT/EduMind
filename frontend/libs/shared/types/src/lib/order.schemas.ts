import { z } from "zod";
import {
  TransactionStatus,
} from "@edumind/shared-constants";
import { createPagedResponseSchema } from "./base-response.schemas.js";
import {
  PaymentMethodSchema,
  OrderStatusSchema,
} from "./checkout.schemas.js";

// ==================== Enum Schemas ====================

export const TransactionStatusSchema = z.nativeEnum(TransactionStatus);

// ==================== Response Schemas ====================

export const OrderItemResponseSchema = z.object({
  id: z.number(),
  courseId: z.number(),

  // Course snapshot
  courseTitle: z.string(),
  courseSlug: z.string(),
  courseThumbnailUrl: z.string().nullable().optional(),

  // Instructor snapshot
  instructorId: z.number(),
  instructorName: z.string(),

  // Pricing (at time of purchase)
  originalPrice: z.number(),
  discountAmount: z.number().nullable().optional(),
  finalPrice: z.number(),
  currency: z.string(),

  createdAt: z.string(),
});

export const TransactionResponseSchema = z.object({
  id: z.number(),
  transactionNumber: z.string(),
  orderId: z.number(),

  // Gateway info
  gateway: PaymentMethodSchema,
  gatewayTransactionId: z.string().nullable().optional(),

  // Amount
  amount: z.number(),
  currency: z.string(),

  // Local currency (for SePay)
  exchangeRate: z.number().nullable().optional(),
  localAmount: z.number().nullable().optional(),
  localCurrency: z.string().nullable().optional(),

  // Status
  status: TransactionStatusSchema,
  failureReason: z.string().nullable().optional(),

  // Timestamps
  createdAt: z.string(),
  processedAt: z.string().nullable().optional(),
});

export const OrderSummaryResponseSchema = z.object({
  id: z.number(),
  orderNumber: z.string(),
  status: OrderStatusSchema,
  totalAmount: z.number(),
  currency: z.string(),
  paymentMethod: PaymentMethodSchema,
  itemCount: z.number(),
  firstCourseTitle: z.string().nullable().optional(),
  firstCourseThumbnail: z.string().nullable().optional(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
});

// Forward declaration for InvoiceResponse (defined in invoice.schemas.ts)
const InvoiceResponseLazySchema = z.lazy(() =>
  z.object({
    id: z.number(),
    invoiceNumber: z.string(),
    pdfUrl: z.string().nullable().optional(),
  })
);

export const OrderResponseSchema = z.object({
  id: z.number(),
  orderNumber: z.string(),
  userId: z.number(),

  // Pricing
  subtotal: z.number(),
  discountTotal: z.number(),
  totalAmount: z.number(),
  currency: z.string(),

  // Payment
  paymentMethod: PaymentMethodSchema,
  status: OrderStatusSchema,

  // Items
  items: z.array(OrderItemResponseSchema),
  itemCount: z.number(),

  // Related
  latestTransaction: TransactionResponseSchema.nullable().optional(),
  invoice: InvoiceResponseLazySchema.nullable().optional(),

  // Timestamps
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),

  // Error info
  failureReason: z.string().nullable().optional(),
});

export const OrderCountResponseSchema = z.object({
  total: z.number(),
  pending: z.number(),
  completed: z.number(),
  failed: z.number(),
  refunded: z.number(),
  cancelled: z.number(),
});

// ==================== Paged Response ====================

export const OrderPagedResponseSchema = createPagedResponseSchema(
  OrderSummaryResponseSchema
);

// ==================== Types ====================

export type OrderItemResponse = z.infer<typeof OrderItemResponseSchema>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponseSchema>;
export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrderCountResponse = z.infer<typeof OrderCountResponseSchema>;
export type OrderPagedResponse = z.infer<typeof OrderPagedResponseSchema>;
