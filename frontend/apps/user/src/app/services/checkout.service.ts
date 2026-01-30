import { apiClient } from "./api-client.service.js";
import {
  CheckoutPreviewResponseSchema,
  CheckoutResultResponseSchema,
  type CheckoutPreviewResponse,
  type CheckoutResultResponse,
  type CheckoutRequest,
  type DirectCheckoutRequest,
} from "@edumind/shared-types";
import { CHECKOUT_ENDPOINTS } from "@edumind/shared-utils";

const parseCheckoutPreview = (payload: unknown): CheckoutPreviewResponse =>
  CheckoutPreviewResponseSchema.parse(payload);

const parseCheckoutResult = (payload: unknown): CheckoutResultResponse =>
  CheckoutResultResponseSchema.parse(payload);

export const checkoutService = {
  /**
   * Preview checkout for items in cart
   */
  async previewCheckout(): Promise<CheckoutPreviewResponse> {
    const response = await apiClient.post<CheckoutPreviewResponse>(
      CHECKOUT_ENDPOINTS.PREVIEW
    );
    return parseCheckoutPreview(response.data);
  },

  /**
   * Process checkout for all items in cart
   */
  async checkout(request: CheckoutRequest): Promise<CheckoutResultResponse> {
    const response = await apiClient.post<CheckoutResultResponse>(
      CHECKOUT_ENDPOINTS.BASE,
      request
    );
    return parseCheckoutResult(response.data);
  },

  /**
   * Preview direct checkout for a single course (Buy Now)
   */
  async previewDirectCheckout(courseId: number): Promise<CheckoutPreviewResponse> {
    const response = await apiClient.post<CheckoutPreviewResponse>(
      CHECKOUT_ENDPOINTS.DIRECT_PREVIEW,
      null,
      { params: { courseId } }
    );
    return parseCheckoutPreview(response.data);
  },

  /**
   * Process direct checkout for a single course (Buy Now)
   */
  async directCheckout(request: DirectCheckoutRequest): Promise<CheckoutResultResponse> {
    const response = await apiClient.post<CheckoutResultResponse>(
      CHECKOUT_ENDPOINTS.DIRECT,
      request
    );
    return parseCheckoutResult(response.data);
  },

  /**
   * Capture payment after PayPal approval
   * Called when user is redirected back from PayPal with token
   */
  async capturePayment(token: string): Promise<CheckoutResultResponse> {
    const response = await apiClient.post<CheckoutResultResponse>(
      CHECKOUT_ENDPOINTS.CAPTURE,
      null,
      { params: { token } }
    );
    return parseCheckoutResult(response.data);
  },

  /**
   * Handle payment cancellation (user cancelled on PayPal)
   * Resets order to pending so user can retry
   */
  async cancelPayment(orderId: number): Promise<CheckoutResultResponse> {
    const response = await apiClient.post<CheckoutResultResponse>(
      CHECKOUT_ENDPOINTS.CANCEL,
      null,
      { params: { orderId } }
    );
    return parseCheckoutResult(response.data);
  },

  /**
   * Check payment status (for polling Sepay QR payments)
   * Returns current order status to detect webhook completion
   */
  async checkPaymentStatus(orderId: number): Promise<CheckoutResultResponse> {
    const response = await apiClient.get<CheckoutResultResponse>(
      CHECKOUT_ENDPOINTS.STATUS(orderId)
    );
    return parseCheckoutResult(response.data);
  },
};

export type CheckoutService = typeof checkoutService;
