import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateTimeRemaining, formatTimeRemaining } from './useCheckout';

describe('useCheckout helpers', () => {
  describe('calculateTimeRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns correct seconds for recent order', () => {
      // Set current time
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      vi.setSystemTime(now);

      // Order created 5 minutes ago (should have 10 minutes = 600 seconds remaining)
      const orderCreatedAt = new Date('2024-01-15T09:55:00Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(10 * 60); // 600 seconds
    });

    it('returns 0 for expired order', () => {
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      vi.setSystemTime(now);

      // Order created 20 minutes ago (expired)
      const orderCreatedAt = new Date('2024-01-15T09:40:00Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(0);
    });

    it('handles Date object input', () => {
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      vi.setSystemTime(now);

      // Order created 5 minutes ago
      const orderCreatedAt = new Date('2024-01-15T09:55:00Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(10 * 60); // 600 seconds
    });

    it('handles ISO string input', () => {
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      vi.setSystemTime(now);

      // Order created 5 minutes ago as ISO string
      const orderCreatedAt = '2024-01-15T09:55:00Z';
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(10 * 60); // 600 seconds
    });

    it('calculates based on 15-minute expiration', () => {
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      vi.setSystemTime(now);

      // Order created exactly 15 minutes ago (just expired)
      const orderCreatedAt = new Date('2024-01-15T09:45:00Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(0);
    });

    it('returns full 15 minutes for order created just now', () => {
      const now = new Date('2024-01-15T10:00:00Z').getTime();
      vi.setSystemTime(now);

      const orderCreatedAt = new Date('2024-01-15T10:00:00Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(15 * 60); // 900 seconds
    });

    it('returns correct value for order created 1 second ago', () => {
      const now = new Date('2024-01-15T10:00:01.000Z').getTime();
      vi.setSystemTime(now);

      const orderCreatedAt = new Date('2024-01-15T10:00:00.000Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(15 * 60 - 1); // 899 seconds
    });

    it('never returns negative values', () => {
      const now = new Date('2024-01-15T12:00:00Z').getTime();
      vi.setSystemTime(now);

      // Order created 2 hours ago (way past expiration)
      const orderCreatedAt = new Date('2024-01-15T10:00:00Z');
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('handles timezone-aware ISO strings', () => {
      const now = new Date('2024-01-15T10:00:00+07:00').getTime();
      vi.setSystemTime(now);

      // Order created 5 minutes ago in same timezone
      const orderCreatedAt = '2024-01-15T09:55:00+07:00';
      const remaining = calculateTimeRemaining(orderCreatedAt);

      expect(remaining).toBe(10 * 60); // 600 seconds
    });
  });

  describe('formatTimeRemaining', () => {
    it('formats 0 seconds as 00:00', () => {
      expect(formatTimeRemaining(0)).toBe('00:00');
    });

    it('formats 59 seconds as 00:59', () => {
      expect(formatTimeRemaining(59)).toBe('00:59');
    });

    it('formats 60 seconds as 01:00', () => {
      expect(formatTimeRemaining(60)).toBe('01:00');
    });

    it('formats 1800 seconds (30 min) as 30:00', () => {
      expect(formatTimeRemaining(1800)).toBe('30:00');
    });

    it('pads single digit minutes and seconds', () => {
      expect(formatTimeRemaining(65)).toBe('01:05');
      expect(formatTimeRemaining(601)).toBe('10:01');
    });

    it('handles exact minute boundaries', () => {
      expect(formatTimeRemaining(120)).toBe('02:00');
      expect(formatTimeRemaining(300)).toBe('05:00');
      expect(formatTimeRemaining(600)).toBe('10:00');
    });

    it('handles arbitrary time values', () => {
      expect(formatTimeRemaining(754)).toBe('12:34');
      expect(formatTimeRemaining(1234)).toBe('20:34');
    });

    it('formats values less than 10 seconds with leading zero', () => {
      expect(formatTimeRemaining(1)).toBe('00:01');
      expect(formatTimeRemaining(5)).toBe('00:05');
      expect(formatTimeRemaining(9)).toBe('00:09');
    });

    it('formats values at edge cases', () => {
      expect(formatTimeRemaining(10)).toBe('00:10');
      expect(formatTimeRemaining(61)).toBe('01:01');
      expect(formatTimeRemaining(119)).toBe('01:59');
    });

    it('handles large values (more than 30 minutes)', () => {
      // While unusual, should still format correctly
      expect(formatTimeRemaining(3600)).toBe('60:00'); // 1 hour
      expect(formatTimeRemaining(3661)).toBe('61:01');
    });
  });
});
