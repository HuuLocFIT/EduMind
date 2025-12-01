import type { ApiResponse, PagedResponse } from "@edumind/shared-types";

type ApiResponseEnvelope<T = unknown> = ApiResponse<T> | PagedResponse<T>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isApiResponseEnvelope = (payload: unknown): payload is ApiResponseEnvelope => {
  if (!isRecord(payload)) return false;

  const candidate = payload as unknown as ApiResponseEnvelope<unknown>;
  return (
    typeof candidate.status === "number" &&
    typeof candidate.success === "boolean"
  );
};

export const hasPagination = (payload: ApiResponseEnvelope): payload is PagedResponse =>
  "pagination" in payload && isRecord((payload as PagedResponse).pagination);

export const toMessageShape = (payload: ApiResponseEnvelope) => ({
  message: payload.message,
  status: payload.status,
  success: payload.success,
});

export const unwrapApiResponse = (payload: unknown): unknown => {
  if (!isApiResponseEnvelope(payload)) {
    return payload;
  }

  if (hasPagination(payload)) {
    return payload;
  }

  if (payload.data !== undefined && payload.data !== null) {
    return payload.data;
  }

  return toMessageShape(payload);
};

