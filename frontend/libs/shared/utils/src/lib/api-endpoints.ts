/**
 * API Endpoints Configuration
 * 
 * Centralized management of all API endpoints used across the application.
 * This ensures consistency, type safety, and easier maintenance.
 */

import { getApiUrl } from './env.config.js';

/**
 * Base API path prefix
 */
export const API_BASE_PATH = '/api' as const;

/**
 * Authentication endpoints
 */
export const AUTH_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/auth`,
  
  // Basic Auth
  LOGIN: `${API_BASE_PATH}/auth/login`,
  SIGNUP: `${API_BASE_PATH}/auth/signup`,
  LOGOUT: `${API_BASE_PATH}/auth/logout`,
  REFRESH: `${API_BASE_PATH}/auth/refresh`,
  
  // Password Reset
  FORGOT_PASSWORD: `${API_BASE_PATH}/auth/password/forgot`,
  RESET_PASSWORD: `${API_BASE_PATH}/auth/password/reset`,
  
  // Email Verification
  VERIFY_EMAIL: `${API_BASE_PATH}/auth/verify-email`,
  RESEND_VERIFICATION: `${API_BASE_PATH}/auth/resend-verification`,
  
  // Two-Factor Authentication
  SETUP_2FA: `${API_BASE_PATH}/auth/2fa/setup`,
  VERIFY_2FA: `${API_BASE_PATH}/auth/2fa/verify`,
  LOGIN_2FA: `${API_BASE_PATH}/auth/2fa/login`,
  DISABLE_2FA: `${API_BASE_PATH}/auth/2fa/disable`,
  BACKUP_CODES: `${API_BASE_PATH}/auth/2fa/backup-codes`,
  
  // OAuth2
  OAUTH2_GOOGLE: `${API_BASE_PATH}/auth/oauth2/google`,
  OAUTH2_FACEBOOK: `${API_BASE_PATH}/auth/oauth2/facebook`,
  OAUTH2_CALLBACK: (provider: 'google' | 'facebook') => 
    `${API_BASE_PATH}/auth/oauth2/callback/${provider}`,
} as const;

/**
 * User endpoints
 */
export const USER_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/users`,
  ME: `${API_BASE_PATH}/users/me`,
  PROFILE: (userId?: string | number) => 
    userId ? `${API_BASE_PATH}/users/${userId}/profile` : `${API_BASE_PATH}/users/profile`,
  UPDATE_PROFILE: (userId?: string | number) => 
    userId ? `${API_BASE_PATH}/users/${userId}` : `${API_BASE_PATH}/users/me`,
  CHANGE_PASSWORD: `${API_BASE_PATH}/users/me/change-password`,
  AVATAR: (userId?: string | number) => 
    userId ? `${API_BASE_PATH}/users/${userId}/avatar` : `${API_BASE_PATH}/users/me/avatar`,
} as const;

/**
 * File upload endpoints
 */
export const UPLOAD_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/upload`,
  IMAGE: `${API_BASE_PATH}/upload/image`,
  DOCUMENT: `${API_BASE_PATH}/upload/document`,
  DELETE: `${API_BASE_PATH}/upload`,
} as const;

/**
 * Course endpoints (for future use)
 */
export const COURSE_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/courses`,
  LIST: `${API_BASE_PATH}/courses`,
  DETAIL: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}`,
  DETAIL_BY_SLUG: (slug: string) => `${API_BASE_PATH}/courses/slug/${slug}`,
  SEARCH: `${API_BASE_PATH}/courses/search`,
  FILTER: `${API_BASE_PATH}/courses/filter`,
  BY_CATEGORY: (categoryId: string | number) =>
    `${API_BASE_PATH}/courses/category/${categoryId}`,
  BY_INSTRUCTOR: (instructorId: string | number) =>
    `${API_BASE_PATH}/courses/instructor/${instructorId}`,
  TOP_RATED: `${API_BASE_PATH}/courses/top-rated`,
  MOST_POPULAR: `${API_BASE_PATH}/courses/most-popular`,
  NEWEST: `${API_BASE_PATH}/courses/newest`,
  FREE: `${API_BASE_PATH}/courses/free`,
} as const;

/**
 * Teacher endpoints (for future use)
 */
export const TEACHER_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/teachers`,
  LIST: `${API_BASE_PATH}/teachers`,
  DETAIL: (teacherId: string | number) => `${API_BASE_PATH}/teachers/${teacherId}`,
  COURSES: (teacherId: string | number) => `${API_BASE_PATH}/teachers/${teacherId}/courses`,
} as const;

/**
 * Student endpoints (for future use)
 */
export const STUDENT_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/students`,
  LIST: `${API_BASE_PATH}/students`,
  DETAIL: (studentId: string | number) => `${API_BASE_PATH}/students/${studentId}`,
  ENROLLMENTS: (studentId: string | number) => `${API_BASE_PATH}/students/${studentId}/enrollments`,
} as const;

/**
 * Category endpoints
 */
export const CATEGORY_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/categories`,
  DETAIL: (categoryId: string | number) => `${API_BASE_PATH}/categories/${categoryId}`,
  ACTIVE: `${API_BASE_PATH}/categories`,
  ALL: `${API_BASE_PATH}/categories/all`,
  WITH_COURSES: `${API_BASE_PATH}/categories/with-courses`,
  TOGGLE_STATUS: (categoryId: string | number) =>
    `${API_BASE_PATH}/categories/${categoryId}/toggle-status`,
} as const;

/**
 * Enrollment endpoints
 */
export const ENROLLMENT_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/enrollments`,
  DETAIL: (enrollmentId: string | number) => `${API_BASE_PATH}/enrollments/${enrollmentId}`,
  MINE: `${API_BASE_PATH}/enrollments/my-enrollments`,
  MY_COMPLETED: `${API_BASE_PATH}/enrollments/my-completed`,
  MY_IN_PROGRESS: `${API_BASE_PATH}/enrollments/my-in-progress`,
  MY_RECENT: `${API_BASE_PATH}/enrollments/my-recent`,
  CHECK: (courseId: string | number) => `${API_BASE_PATH}/enrollments/check/${courseId}`,
  STUDENT: (studentId: string | number) => `${API_BASE_PATH}/enrollments/student/${studentId}`,
  COURSE: (courseId: string | number) => `${API_BASE_PATH}/enrollments/courses/${courseId}`,
} as const;

// Section endpoints
export const SECTION_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/sections`,
  DETAIL: (sectionId: string | number) => `${API_BASE_PATH}/sections/${sectionId}`,
  COURSE: (courseId: string | number) => `${API_BASE_PATH}/sections/courses/${courseId}`,
  LESSON: (lessonId: string | number) => `${API_BASE_PATH}/sections/lessons/${lessonId}`,
} as const;

// Lesson endpoints
export const LESSON_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/lessons`,
  DETAIL: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}`,
  COURSE: (courseId: string | number) => `${API_BASE_PATH}/lessons/courses/${courseId}`,
  SECTION: (sectionId: string | number) => `${API_BASE_PATH}/lessons/sections/${sectionId}`,
  WATCH: `${API_BASE_PATH}/lessons/watch`,
  COMPLETE: `${API_BASE_PATH}/lessons/complete`,
} as const;

/**
 * Lesson progress endpoints
 */
export const LESSON_PROGRESS_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/progress`,
  START: `${API_BASE_PATH}/progress/start`,
  WATCH: `${API_BASE_PATH}/progress/watch`,
  COMPLETE: `${API_BASE_PATH}/progress/complete`,
  ENROLLMENT: (enrollmentId: string | number) =>
    `${API_BASE_PATH}/progress/enrollment/${enrollmentId}`,
  ENROLLMENT_COMPLETED: (enrollmentId: string | number) =>
    `${API_BASE_PATH}/progress/enrollment/${enrollmentId}/completed`,
  CHECK: `${API_BASE_PATH}/progress/check`,
} as const;

/**
 * Course review endpoints
 */
export const REVIEW_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/reviews`,
  DETAIL: (reviewId: string | number) => `${API_BASE_PATH}/reviews/${reviewId}`,
  COURSE: (courseId: string | number) => `${API_BASE_PATH}/reviews/courses/${courseId}`,
  COURSE_ALL: (courseId: string | number) =>
    `${API_BASE_PATH}/reviews/courses/${courseId}/all`,
  COURSE_MY_REVIEW: (courseId: string | number) =>
    `${API_BASE_PATH}/reviews/courses/${courseId}/my-review`,
  COURSE_RATING_DISTRIBUTION: (courseId: string | number) =>
    `${API_BASE_PATH}/reviews/courses/${courseId}/rating-distribution`,
  HAS_REVIEWED: (courseId: string | number) =>
    `${API_BASE_PATH}/reviews/courses/${courseId}/has-reviewed`,
  MY_REVIEWS: `${API_BASE_PATH}/reviews/my-reviews`,
  PENDING: `${API_BASE_PATH}/reviews/pending`,
} as const;

/**
 * Wishlist endpoints
 */
export const WISHLIST_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/wishlist`,
  ITEM: (courseId: string | number) => `${API_BASE_PATH}/wishlist/courses/${courseId}`,
  CHECK: (courseId: string | number) => `${API_BASE_PATH}/wishlist/courses/${courseId}/check`,
  COUNT: `${API_BASE_PATH}/wishlist/count`,
  CLEAR: `${API_BASE_PATH}/wishlist/clear`,
} as const;

/**
 * Payment endpoints (for future use)
 */
export const PAYMENT_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/payments`,
  CREATE: `${API_BASE_PATH}/payments`,
  DETAIL: (paymentId: string | number) => `${API_BASE_PATH}/payments/${paymentId}`,
  HISTORY: `${API_BASE_PATH}/payments/history`,
  VERIFY: (paymentId: string | number) => `${API_BASE_PATH}/payments/${paymentId}/verify`,
} as const;

/**
 * Admin endpoints (for future use)
 */
export const ADMIN_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/admin`,
  
  // Dashboard
  DASHBOARD_STATS: `${API_BASE_PATH}/admin/dashboard/stats`,
  
  // Users Management
  USERS: `${API_BASE_PATH}/admin/users`,
  USER_DETAIL: (userId: string | number) => `${API_BASE_PATH}/admin/users/${userId}`,
  USER_UPDATE: (userId: string | number) => `${API_BASE_PATH}/admin/users/${userId}`,
  USER_DELETE: (userId: string | number) => `${API_BASE_PATH}/admin/users/${userId}`,
  
  // Courses Management
  COURSES: `${API_BASE_PATH}/admin/courses`,
  COURSE_CREATE: `${API_BASE_PATH}/admin/courses`,
  COURSE_DETAIL: (courseId: string | number) => `${API_BASE_PATH}/admin/courses/${courseId}`,
  COURSE_UPDATE: (courseId: string | number) => `${API_BASE_PATH}/admin/courses/${courseId}`,
  COURSE_DELETE: (courseId: string | number) => `${API_BASE_PATH}/admin/courses/${courseId}`,
  
  // Teachers Management
  TEACHERS: `${API_BASE_PATH}/admin/teachers`,
  TEACHER_CREATE: `${API_BASE_PATH}/admin/teachers`,
  TEACHER_DETAIL: (teacherId: string | number) => `${API_BASE_PATH}/admin/teachers/${teacherId}`,
  TEACHER_UPDATE: (teacherId: string | number) => `${API_BASE_PATH}/admin/teachers/${teacherId}`,
  TEACHER_DELETE: (teacherId: string | number) => `${API_BASE_PATH}/admin/teachers/${teacherId}`,
  
  // Students Management
  STUDENTS: `${API_BASE_PATH}/admin/students`,
  STUDENT_DETAIL: (studentId: string | number) => `${API_BASE_PATH}/admin/students/${studentId}`,
  STUDENT_UPDATE: (studentId: string | number) => `${API_BASE_PATH}/admin/students/${studentId}`,
  STUDENT_DELETE: (studentId: string | number) => `${API_BASE_PATH}/admin/students/${studentId}`,
  
  // Reports
  REPORTS: `${API_BASE_PATH}/admin/reports`,
  REPORT_GENERATE: (reportType: string) => `${API_BASE_PATH}/admin/reports/${reportType}`,
} as const;

/**
 * Helper function to build full URL with base API URL
 * Uses environment configuration for default API URL
 */
export const buildApiUrl = (
  endpoint: string,
  baseUrl?: string
): string => {
  const apiBase = baseUrl || getApiUrl();
  
  // Remove leading slash from endpoint if baseUrl already has trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `${apiBase}${cleanEndpoint}`;
};

/**
 * Helper function to get OAuth2 URL (full URL for redirect)
 */
export const getOAuth2Url = (
  provider: 'google' | 'facebook',
  baseUrl?: string
): string => {
  const endpoint = provider === 'google' 
    ? AUTH_ENDPOINTS.OAUTH2_GOOGLE 
    : AUTH_ENDPOINTS.OAUTH2_FACEBOOK;
  return buildApiUrl(endpoint, baseUrl);
};

