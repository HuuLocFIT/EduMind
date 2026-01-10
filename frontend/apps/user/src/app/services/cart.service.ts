import { apiClient } from "./api-client.service.js";
import {
  CartResponseSchema,
  type CartResponse,
  type AddToCartRequest,
} from "@edumind/shared-types";
import { CART_ENDPOINTS } from "@edumind/shared-utils";

const parseCartResponse = (payload: unknown): CartResponse =>
  CartResponseSchema.parse(payload);

export const cartService = {
  /**
   * Get current user's cart
   */
  async getCart(): Promise<CartResponse> {
    const response = await apiClient.get<CartResponse>(CART_ENDPOINTS.BASE);
    return parseCartResponse(response.data);
  },

  /**
   * Add course to cart
   */
  async addToCart(courseId: number): Promise<CartResponse> {
    const request: AddToCartRequest = { courseId };
    const response = await apiClient.post<CartResponse>(
      CART_ENDPOINTS.ITEMS,
      request
    );
    return parseCartResponse(response.data);
  },

  /**
   * Remove course from cart
   */
  async removeFromCart(courseId: number): Promise<CartResponse> {
    const response = await apiClient.delete<CartResponse>(
      CART_ENDPOINTS.ITEM(courseId)
    );
    return parseCartResponse(response.data);
  },

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    await apiClient.delete(CART_ENDPOINTS.BASE);
  },

  /**
   * Get cart item count (for badge display)
   */
  async getCartCount(): Promise<number> {
    const response = await apiClient.get<number>(CART_ENDPOINTS.COUNT);
    return response.data ?? 0;
  },

  /**
   * Check if course is in cart
   */
  async isInCart(courseId: number): Promise<boolean> {
    const response = await apiClient.get<boolean>(CART_ENDPOINTS.CHECK(courseId));
    return response.data ?? false;
  },
};

export type CartService = typeof cartService;
