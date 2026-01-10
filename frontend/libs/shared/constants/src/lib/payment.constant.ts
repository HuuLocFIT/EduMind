/**
 * Payment Method enum
 * Defines available payment gateways
 */
export const PaymentMethod = {
  FREE: "FREE",
  MOCK: "MOCK",
  PAYPAL: "PAYPAL",
  SEPAY: "SEPAY",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/**
 * Order Status enum
 * Tracks the lifecycle of an order
 */
export const OrderStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/**
 * Earning Status enum
 * Tracks instructor earning status
 */
export const EarningStatus = {
  PENDING: "PENDING",
  AVAILABLE: "AVAILABLE",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
} as const;
export type EarningStatus = (typeof EarningStatus)[keyof typeof EarningStatus];

/**
 * Invoice Status enum
 * Tracks invoice lifecycle
 */
export const InvoiceStatus = {
  GENERATED: "GENERATED",
  SENT: "SENT",
  VIEWED: "VIEWED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/**
 * Transaction Status enum
 * Tracks payment transaction status
 */
export const TransactionStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type TransactionStatus =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];
