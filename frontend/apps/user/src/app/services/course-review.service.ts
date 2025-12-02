import { apiClient } from "./api-client.service.js";
import { z } from "zod";
import {
  CreateReviewRequestSchema,
  ReviewResponseSchema,
  UpdateReviewRequestSchema,
  RatingDistributionResponseSchema,
  type CreateReviewRequest,
  type ReviewResponse,
  type UpdateReviewRequest,
  type RatingDistributionResponse,
} from "@edumind/shared-types";
import { REVIEW_ENDPOINTS } from "@edumind/shared-utils";

const ReviewArraySchema = z.array(ReviewResponseSchema);
const SpringPageSchema = z
  .object({
    content: ReviewArraySchema,
  })
  .passthrough();

type SpringPage<T> = {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  [key: string]: unknown;
};

const parseReview = (payload: unknown): ReviewResponse =>
  ReviewResponseSchema.parse(payload);

const parseReviewPage = (
  payload: unknown
): SpringPage<ReviewResponse> => SpringPageSchema.parse(payload) as SpringPage<ReviewResponse>;

export interface ReviewQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc" | "ASC" | "DESC";
}

export const courseReviewService = {
  async createReview(
    courseId: number | string,
    payload: CreateReviewRequest
  ): Promise<ReviewResponse> {
    const body = CreateReviewRequestSchema.parse(payload);
    const response = await apiClient.post<ReviewResponse>(
      REVIEW_ENDPOINTS.COURSE(courseId),
      body
    );
    return parseReview(response.data);
  },

  async updateReview(
    reviewId: number | string,
    payload: UpdateReviewRequest
  ): Promise<ReviewResponse> {
    const body = UpdateReviewRequestSchema.parse(payload);
    const response = await apiClient.put<ReviewResponse>(
      REVIEW_ENDPOINTS.DETAIL(reviewId),
      body
    );
    return parseReview(response.data);
  },

  async deleteReview(reviewId: number | string): Promise<void> {
    await apiClient.delete(REVIEW_ENDPOINTS.DETAIL(reviewId));
  },

  async getCourseReviews(
    courseId: number | string,
    params: ReviewQueryParams = {}
  ): Promise<SpringPage<ReviewResponse>> {
    const response = await apiClient.get<SpringPage<ReviewResponse>>(
      REVIEW_ENDPOINTS.COURSE(courseId),
      { params }
    );
    return parseReviewPage(response.data);
  },

  async getMyReview(courseId: number | string): Promise<ReviewResponse | null> {
    const response = await apiClient.get<ReviewResponse | null>(
      REVIEW_ENDPOINTS.COURSE_MY_REVIEW(courseId)
    );

    try {
      return parseReview(response.data);
    } catch {
      return null;
    }
  },

  async getMyReviews(
    params: ReviewQueryParams = {}
  ): Promise<SpringPage<ReviewResponse>> {
    const response = await apiClient.get<SpringPage<ReviewResponse>>(
      REVIEW_ENDPOINTS.MY_REVIEWS,
      { params }
    );
    return parseReviewPage(response.data);
  },

  async getRatingDistribution(
    courseId: number | string
  ): Promise<RatingDistributionResponse> {
    const response = await apiClient.get<RatingDistributionResponse>(
      REVIEW_ENDPOINTS.COURSE_RATING_DISTRIBUTION(courseId)
    );
    return RatingDistributionResponseSchema.parse(response.data);
  },

  async hasReviewed(courseId: number | string): Promise<boolean> {
    const response = await apiClient.get<boolean>(
      REVIEW_ENDPOINTS.HAS_REVIEWED(courseId)
    );
    return z.boolean().parse(response.data);
  },
};

export type CourseReviewService = typeof courseReviewService;

