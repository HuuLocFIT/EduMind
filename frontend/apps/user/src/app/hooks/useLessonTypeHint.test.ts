import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLessonTypeHint } from './useLessonTypeHint';

const { mockSearchParams, mockLocation } = vi.hoisted(() => ({
  mockSearchParams: { current: new URLSearchParams() },
  mockLocation: { current: { pathname: '/learning/test-slug' } },
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams.current],
  useLocation: () => mockLocation.current,
}));

beforeEach(() => {
  mockSearchParams.current = new URLSearchParams();
  mockLocation.current = { pathname: '/learning/test-slug' };
  localStorage.clear();
});

describe('useLessonTypeHint', () => {
  it('falls back to the course-scoped localStorage hint keyed by the slug from a /learning/:slug pathname', () => {
    localStorage.setItem('course_test-slug_last_lesson_type', 'ARTICLE');

    const { result } = renderHook(() => useLessonTypeHint());

    expect(result.current).toBe('ARTICLE');
  });

  it('does not resolve a hint from the old courses/:id path shape (no writer uses that key format)', () => {
    mockLocation.current = { pathname: '/courses/123' };
    localStorage.setItem('course_123_last_lesson_type', 'ARTICLE');

    const { result } = renderHook(() => useLessonTypeHint());

    expect(result.current).toBeUndefined();
  });

  it('prefers the ?type= query param over the localStorage hint', () => {
    localStorage.setItem('course_test-slug_last_lesson_type', 'ARTICLE');
    mockSearchParams.current = new URLSearchParams({ type: 'quiz' });

    const { result } = renderHook(() => useLessonTypeHint());

    expect(result.current).toBe('QUIZ');
  });

  it('prefers the per-lesson localStorage hint over the per-course one when a lesson id is present', () => {
    mockSearchParams.current = new URLSearchParams({ lesson: '7' });
    localStorage.setItem('lesson_7_type', 'VIDEO');
    localStorage.setItem('course_test-slug_last_lesson_type', 'ARTICLE');

    const { result } = renderHook(() => useLessonTypeHint());

    expect(result.current).toBe('VIDEO');
  });
});
