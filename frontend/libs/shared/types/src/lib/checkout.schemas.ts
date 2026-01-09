import { z } from "zod";
import {
  PaymentMethod,
  OrderStatus,
} from "@edumind/shared-constants";

// ==================== Enum Schemas ====================

export const PaymentMethodSchema = z.nativeEnum(PaymentMethod);
export const OrderStatusSchema = z.nativeEnum(OrderStatus);

// ==================== Request Schemas ====================

export const CheckoutRequestSchema = z.object({
  paymentMethod: PaymentMethodSchema,

  // For Mock gateway testing
  cardNumber: z.string().optional().nullable(),
  cardHolderName: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  cvv: z.string().optional().nullable(),

  // Customer info
  customerEmail: z.string().email("Valid email is required").optional(),
  customerName: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),

  // Return URLs (for PayPal/SePay redirect flows)
  successUrl: z.string().url().optional().nullable(),
  cancelUrl: z.string().url().optional().nullable(),

  // Metadata (auto-filled by controller)
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

export const DirectCheckoutRequestSchema = z.object({
  courseId: z.number().int().positive("Course ID is required"),
  paymentMethod: PaymentMethodSchema,

  // For Mock gateway testing
  cardNumber: z.string().optional().nullable(),
  cardHolderName: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  cvv: z.string().optional().nullable(),

  // Customer info
  customerEmail: z.string().email("Valid email is required").optional(),
  customerName: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),

  // Return URLs
  successUrl: z.string().url().optional().nullable(),
  cancelUrl: z.string().url().optional().nullable(),

  // Metadata
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

// ==================== Response Schemas ====================

export const CheckoutItemPreviewSchema = z.object({
  courseId: z.number(),
  courseTitle: z.string(),
  courseSlug: z.string(),
  courseThumbnailUrl: z.string().nullable().optional(),
  instructorName: z.string(),
  instructorId: z.number(),

  originalPrice: z.number(),
  effectivePrice: z.number(),
  discountAmount: z.number().nullable().optional(),
  currency: z.string(),

  isFree: z.boolean(),
});

export const CheckoutPreviewResponseSchema = z.object({
  items: z.array(CheckoutItemPreviewSchema),
  itemCount: z.number(),

  // Pricing breakdown
  subtotal: z.number(),
  discountTotal: z.number(),
  taxAmount: z.number(),
  taxRate: z.number(),
  totalAmount: z.number(),
  currency: z.string(),

  // Payment options
  isFreeCheckout: z.boolean(),
  requiresPayment: z.boolean(),
  availablePaymentMethods: z.array(z.string()),

  // Validation
  isValid: z.boolean(),
  validationErrors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export const CheckoutResultResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().nullable().optional(),

  // Order info
  orderId: z.number().nullable().optional(),
  orderNumber: z.string().nullable().optional(),
  orderStatus: OrderStatusSchema.nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  paymentMethod: PaymentMethodSchema.nullable().optional(),
  pending: z.boolean().optional(),

  // Transaction info
  transactionNumber: z.string().nullable().optional(),
  gatewayTransactionId: z.string().nullable().optional(),

  // Enrolled courses
  enrolledCourseIds: z.array(z.number()).optional(),

  // Invoice
  invoiceNumber: z.string().nullable().optional(),
  invoiceUrl: z.string().nullable().optional(),

  // For redirect
  redirectUrl: z.string().nullable().optional(),
  requiresRedirect: z.boolean().optional(),

  // Timestamps
  createdAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),

  // Error info
  errorCode: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

// ==================== Types ====================

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type DirectCheckoutRequest = z.infer<typeof DirectCheckoutRequestSchema>;
export type CheckoutItemPreview = z.infer<typeof CheckoutItemPreviewSchema>;
export type CheckoutPreviewResponse = z.infer<
  typeof CheckoutPreviewResponseSchema
>;
export type CheckoutResultResponse = z.infer<
  typeof CheckoutResultResponseSchema
>;
