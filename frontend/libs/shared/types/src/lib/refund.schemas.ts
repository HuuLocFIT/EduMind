import { z } from "zod";
import { createPagedResponseSchema } from "./base-response.schemas.js";

// Request schemas
// Base schema with optional bank fields
export const RefundRequestSchema = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
  // Bank account information for manual refunds (optional - only required for SePay)
  // Validation is handled conditionally in the component based on payment method
  bankName: z.string().max(100).optional(),
  accountHolderName: z.string().max(100).optional(),
  accountNumber: z.string().max(50).optional(),
  swiftCode: z.string().max(20).optional(), // Optional for international transfers
  bankAddress: z.string().max(200).optional(), // Optional additional info
});

export const AdminRefundApproveSchema = z.object({
  notes: z.string().optional(),
});

export const AdminRefundRejectSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export const ConfirmManualRefundRequestSchema = z.object({
  bankTransferReference: z.string().min(1, "Bank transfer reference is required"),
});

// Response schemas
export const RefundResponseSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  orderNumber: z.string(),
  userId: z.number(),
  requestedAmount: z.number(),
  currency: z.string(),
  reason: z.string(),
  bankName: z.string().nullable().optional(),
  accountHolderName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  swiftCode: z.string().nullable().optional(),
  bankAddress: z.string().nullable().optional(),
  status: z.string(),
  requestedAt: z.string(),
  approvedAt: z.string().nullable().optional(),
  approvedBy: z.number().nullable().optional(),
  approvedByName: z.string().nullable().optional(), // Display name of admin who approved
  processedAt: z.string().nullable().optional(),
  refundTransactionId: z.string().nullable().optional(),
  gatewayRefundId: z.string().nullable().optional(),
  gatewayResponse: z.string().nullable().optional(), // Error message for FAILED refunds
  rejectionReason: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  rejectedBy: z.number().nullable().optional(),
  rejectedByName: z.string().nullable().optional(), // Display name of admin who rejected
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RefundPolicyResponseSchema = z.object({
  autoApproveDays: z.number(),
  maxRefundDays: z.number(),
  partialRefundThreshold: z.number(),
  eligibleRefundAmount: z.number(),
  eligible: z.boolean(),
  eligibilityReason: z.string(),
  requiresAdminApproval: z.boolean(),
});

export const RefundPagedResponseSchema = createPagedResponseSchema(RefundResponseSchema);

// Types
export type RefundRequest = z.infer<typeof RefundRequestSchema>;
export type AdminRefundApprove = z.infer<typeof AdminRefundApproveSchema>;
export type AdminRefundReject = z.infer<typeof AdminRefundRejectSchema>;
export type ConfirmManualRefundRequest = z.infer<typeof ConfirmManualRefundRequestSchema>;
export type RefundResponse = z.infer<typeof RefundResponseSchema>;
export type RefundPolicyResponse = z.infer<typeof RefundPolicyResponseSchema>;
