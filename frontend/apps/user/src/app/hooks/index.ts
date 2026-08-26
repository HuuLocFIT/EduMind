// Cart hooks
export {
  useCart,
  useCartCount,
  useIsInCart,
  useAddToCart,
  useRemoveFromCart,
  useClearCart,
} from "./useCart";

// Checkout hooks
export {
  useCheckoutPreview,
  useDirectCheckoutPreview,
  useCheckout,
  useDirectCheckout,
} from "./useCheckout";

// Order hooks
export {
  useOrders,
  useOrder,
  useOrderByNumber,
  useOrderCounts,
  useCancelOrder,
  useRequestRefund,
} from "./useOrders";

// Invoice hooks
export {
  useInvoices,
  useInvoice,
  useInvoiceByNumber,
  useInvoiceByOrder,
} from "./useInvoices";

// Teacher application hooks
export {
  useTeacherApplication,
  useTeacherApplicationStatus,
} from "./useTeacherApplication";

// Teacher role sync (keeps auth store roles in sync after application approval)
export { useTeacherRoleSync } from "./useTeacherRoleSync";

// Prerender/auth UI coordination
export { useAuthUiReady } from "./useAuthUiReady";

// Earnings hooks
export {
  useEarnings,
  useEarning,
  useEarningsSummary,
  useMonthlyEarnings,
  useEarningsByCourse,
} from "./useEarnings";
