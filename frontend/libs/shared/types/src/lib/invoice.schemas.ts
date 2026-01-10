import { z } from "zod";
import { InvoiceStatus } from "@edumind/shared-constants";
import { createPagedResponseSchema } from "./base-response.schemas.js";
import { OrderItemResponseSchema } from "./order.schemas.js";

// ==================== Enum Schemas ====================

export const InvoiceStatusSchema = z.nativeEnum(InvoiceStatus);

// ==================== Response Schemas ====================

export const InvoiceResponseSchema = z.object({
  id: z.number(),
  invoiceNumber: z.string(),
  orderId: z.number(),
  orderNumber: z.string(),

  // Seller info
  sellerName: z.string(),
  sellerAddress: z.string().nullable().optional(),
  sellerTaxId: z.string().nullable().optional(),
  sellerEmail: z.string().nullable().optional(),
  sellerPhone: z.string().nullable().optional(),

  // Buyer info
  buyerId: z.number(),
  buyerName: z.string(),
  buyerEmail: z.string(),

  // Line items
  items: z.array(OrderItemResponseSchema),

  // Amounts
  subtotal: z.number(),
  discountTotal: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  currency: z.string(),

  // PDF
  pdfUrl: z.string().nullable().optional(),
  hasPdf: z.boolean(),

  // Status
  status: InvoiceStatusSchema,

  // Timestamps
  issuedAt: z.string(),
  sentAt: z.string().nullable().optional(),
  viewedAt: z.string().nullable().optional(),
});

// ==================== Paged Response ====================

export const InvoicePagedResponseSchema = createPagedResponseSchema(
  InvoiceResponseSchema
);

// ==================== Types ====================

export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;
export type InvoicePagedResponse = z.infer<typeof InvoicePagedResponseSchema>;
