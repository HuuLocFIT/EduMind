import { z } from "zod";
import { createPagedResponseSchema } from "./base-response.schemas.js";

// Request schemas
export const CreatePayoutRequestSchema = z.object({
  instructorId: z.number().int().positive(),
  paymentMethod: z.string(),
  earningIds: z.array(z.number()).optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().max(100).optional(),
  accountHolderName: z.string().max(100).optional(),
  swiftCode: z.string().max(20).optional(),
  bankAddress: z.string().max(200).optional(),
  paypalEmail: z.string().email().optional(),
});

export const ConfirmManualPayoutRequestSchema = z.object({
  bankTransferReference: z.string().min(1, "Bank transfer reference is required"),
});

export const UpdatePayoutRecipientSchema = z.object({
  paymentMethod: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().max(100).optional(),
  accountHolderName: z.string().max(100).optional(),
  swiftCode: z.string().max(20).optional(),
  bankAddress: z.string().max(200).optional(),
  paypalEmail: z.string().email().optional(),
});

// Response schemas
export const PayoutItemResponseSchema = z.object({
  earningId: z.number(),
  orderId: z.number(),
  orderNumber: z.string(),
  courseId: z.number(),
  courseTitle: z.string(),
  netAmount: z.number(),
  currency: z.string(),
});

export const PayoutResponseSchema = z.object({
  id: z.number(),
  payoutNumber: z.string(),
  instructorId: z.number(),
  totalAmount: z.number(),
  currency: z.string(),
  paymentMethod: z.string(),
  status: z.string(),
  scheduledAt: z.string().nullable().optional(),
  processedAt: z.string().nullable().optional(),
  gatewayTransactionId: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountHolderName: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  swiftCode: z.string().nullable().optional(),
  bankAddress: z.string().nullable().optional(),
  paypalEmail: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  failureCode: z.string().nullable().optional(),
  retryCount: z.number().nullable().optional(),
  items: z.array(PayoutItemResponseSchema).nullable().optional(),
  earningsCount: z.number().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PayoutSummaryResponseSchema = z.object({
  instructorId: z.number(),
  totalPayouts: z.coerce.number(),
  pendingPayouts: z.coerce.number(),
  availableForPayout: z.coerce.number(),
  totalPayoutCount: z.coerce.number(),
  lastPayoutDate: z.string().nullable().optional(),
  currency: z.string().nullable().default("USD"),
});

export const PayoutPagedResponseSchema = createPagedResponseSchema(PayoutResponseSchema);

export const PayoutSettingsSchema = z.object({
  preferredMethod: z.string().nullable().default("BANK_TRANSFER"),
  bankName: z.string().max(100).nullable().optional(),
  accountHolderName: z.string().max(100).nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  swiftCode: z.string().max(20).nullable().optional(),
  bankAddress: z.string().max(200).nullable().optional(),
  paypalEmail: z.string().email().nullable().optional(),
});

// Types
export type CreatePayoutRequest = z.infer<typeof CreatePayoutRequestSchema>;
export type ConfirmManualPayoutRequest = z.infer<typeof ConfirmManualPayoutRequestSchema>;
export type UpdatePayoutRecipient = z.infer<typeof UpdatePayoutRecipientSchema>;
export type PayoutItemResponse = z.infer<typeof PayoutItemResponseSchema>;
export type PayoutResponse = z.infer<typeof PayoutResponseSchema>;
export type PayoutSummaryResponse = z.infer<typeof PayoutSummaryResponseSchema>;
export type PayoutSettings = z.infer<typeof PayoutSettingsSchema>;