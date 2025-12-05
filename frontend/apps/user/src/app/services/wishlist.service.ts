import { apiClient } from "./api-client.service.js";
import { z } from "zod";
import {
  WishlistItemResponseSchema,
  type WishlistItemResponse,
  type PagedResponse,
  createPagedResponseSchema,
} from "@edumind/shared-types";
import { WISHLIST_ENDPOINTS } from "@edumind/shared-utils";

const WishlistPagedResponseSchema = createPagedResponseSchema(
  WishlistItemResponseSchema
);

type WishlistPagedResponse = z.infer<typeof WishlistPagedResponseSchema> &
  PagedResponse<WishlistItemResponse>;

const WishlistListSchema = z.array(WishlistItemResponseSchema);

const parseWishlistItem = (payload: unknown): WishlistItemResponse =>
  WishlistItemResponseSchema.parse(payload);

const parseWishlistList = (payload: unknown): WishlistItemResponse[] =>
  WishlistListSchema.parse(payload);

const parseWishlistPagedResponse = (
  payload: unknown
): WishlistPagedResponse =>
  WishlistPagedResponseSchema.parse(payload) as WishlistPagedResponse;

export interface WishlistQueryParams {
  page?: number;
  size?: number;
}

export const wishlistService = {
  async add(courseId: number | string): Promise<WishlistItemResponse> {
    const response = await apiClient.post<WishlistItemResponse>(
      WISHLIST_ENDPOINTS.ITEM(courseId)
    );
    return parseWishlistItem(response.data);
  },

  async remove(courseId: number | string): Promise<void> {
    await apiClient.delete(WISHLIST_ENDPOINTS.ITEM(courseId));
  },

  async getWishlist(
    params: WishlistQueryParams = {}
  ): Promise<PagedResponse<WishlistItemResponse>> {
    const response = await apiClient.get<WishlistPagedResponse>(
      WISHLIST_ENDPOINTS.BASE,
      { params }
    );
    return parseWishlistPagedResponse(response.data);
  },

  async getWishlistPreview(): Promise<WishlistItemResponse[]> {
    const response = await apiClient.get<WishlistItemResponse[]>(
      WISHLIST_ENDPOINTS.BASE,
      { params: { size: 5 } }
    );
    return parseWishlistList(response.data);
  },

  async isInWishlist(courseId: number | string): Promise<boolean> {
    const response = await apiClient.get<boolean>(
      WISHLIST_ENDPOINTS.CHECK(courseId)
    );
    return z.boolean().parse(response.data);
  },

  async getCount(): Promise<number> {
    const response = await apiClient.get<number>(WISHLIST_ENDPOINTS.COUNT);
    return z.number().int().nonnegative().parse(response.data);
  },

  async clear(): Promise<void> {
    await apiClient.delete(WISHLIST_ENDPOINTS.CLEAR);
  },
};

export type WishlistService = typeof wishlistService;

