import { describe, it, expect } from 'vitest';
import { queryClient } from './query-client';

/**
 * The retry policy reads a status off the rejected error. apiClient's interceptor rejects
 * with a FLAT ApiError (`{ message, status, timestamp }`) — no `.response` — so a policy
 * that only understood the AxiosError shape silently retried every 4xx it was written to
 * skip, including a 403 dead-session query.
 */
describe('queryClient retry policy', () => {
  const retry = queryClient.getDefaultOptions().queries?.retry as (
    failureCount: number,
    error: unknown,
  ) => boolean;

  const apiError = (status: number) => ({ message: 'nope', status, timestamp: '2026-01-01' });
  const axiosError = (status: number) => ({ response: { status } });

  it.each([400, 401, 403, 404, 409])('does not retry a flat ApiError with status %i', (status) => {
    expect(retry(0, apiError(status))).toBe(false);
  });

  it.each([400, 403, 404])('does not retry an AxiosError with status %i', (status) => {
    expect(retry(0, axiosError(status))).toBe(false);
  });

  it('still retries 429 and 5xx', () => {
    expect(retry(0, apiError(429))).toBe(true);
    expect(retry(0, apiError(503))).toBe(true);
  });

  it('retries a transport failure with no status (the refresh-blip case)', () => {
    // A refresh that died on the network is normalized to status 0 precisely so this
    // retries instead of being written off as a client error.
    expect(retry(0, apiError(0))).toBe(true);
  });

  it('still caps retries at 2', () => {
    expect(retry(1, apiError(0))).toBe(true);
    expect(retry(2, apiError(0))).toBe(false);
  });
});
