/**
 * React Query Configuration Constants
 * 
 * Centralized configuration for staleTime, cacheTime, and other query options.
 * This ensures consistency across the application.
 */

// ============================================
// Stale Time Constants (in milliseconds)
// ============================================

/**
 * Public courses (featured, popular, top-rated)
 * These change less frequently, can cache longer
 */
export const STALE_TIME_COURSES_PUBLIC = 10 * 60 * 1000; // 10 minutes

/**
 * Course details
 * Cache for 5 minutes as course info doesn't change often
 */
export const STALE_TIME_COURSE_DETAIL = 5 * 60 * 1000; // 5 minutes

/**
 * Enrollments
 * User's enrollments - cache for 5 minutes
 */
export const STALE_TIME_ENROLLMENTS = 5 * 60 * 1000; // 5 minutes

/**
 * Wishlist
 * User's wishlist - cache for 2 minutes
 */
export const STALE_TIME_WISHLIST = 2 * 60 * 1000; // 2 minutes

/**
 * Categories
 * Categories change rarely, cache for 10 minutes
 */
export const STALE_TIME_CATEGORIES = 10 * 60 * 1000; // 10 minutes

/**
 * Instructor stats
 * Instructor stats don't change frequently
 */
export const STALE_TIME_INSTRUCTOR_STATS = 5 * 60 * 1000; // 5 minutes

/**
 * Course reviews
 * Reviews can be added frequently, but cache for 5 minutes
 */
export const STALE_TIME_REVIEWS = 5 * 60 * 1000; // 5 minutes

/**
 * Teacher courses
 * Teacher's own courses - cache for 2 minutes
 */
export const STALE_TIME_TEACHER_COURSES = 2 * 60 * 1000; // 2 minutes

/**
 * Teacher reviews
 * Reviews and stats - cache for 2 minutes
 */
export const STALE_TIME_TEACHER_REVIEWS = 2 * 60 * 1000; // 2 minutes

/**
 * Lesson quiz + a student's own attempts
 * Cache for 5 minutes so revisiting a quiz lesson in the same session
 * doesn't refetch/re-show a loading state; attempts are patched into the
 * cache directly on submit instead of relying on staleness.
 */
export const STALE_TIME_QUIZ = 5 * 60 * 1000; // 5 minutes

/**
 * AI-generated lesson summary
 * Cache for 5 minutes so revisiting a lesson in the same session renders
 * the summary instantly instead of re-showing a loading state.
 */
export const STALE_TIME_LESSON_SUMMARY = 5 * 60 * 1000; // 5 minutes

// ============================================
// Retry Configuration
// ============================================
export const RETRY_CONFIG = {
  default: 1,
  critical: 3, // For critical operations
} as const;

// ============================================
// Cache Time (garbage collection)
// ============================================
export const CACHE_TIME = {
  default: 5 * 60 * 1000, // 5 minutes
  long: 30 * 60 * 1000, // 30 minutes
} as const;

