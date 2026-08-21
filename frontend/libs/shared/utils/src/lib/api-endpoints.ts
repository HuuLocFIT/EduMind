/**
 * API Endpoints Configuration
 * 
 * Centralized management of all API endpoints used across the application.
 * This ensures consistency, type safety, and easier maintenance.
 */

import { API_URL } from './env.config.js';

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
  VALIDATE_RESET_TOKEN: `${API_BASE_PATH}/auth/password/validate-token`,
  
  // Email Verification
  VERIFY_EMAIL: `${API_BASE_PATH}/auth/verify-email`,
  RESEND_VERIFICATION: `${API_BASE_PATH}/auth/resend-verification`,
  
  // Two-Factor Authentication
  SETUP_2FA: `${API_BASE_PATH}/auth/2fa/setup`,
  VERIFY_2FA: `${API_BASE_PATH}/auth/2fa/verify`,
  LOGIN_2FA: `${API_BASE_PATH}/auth/login/2fa`,
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
  DELETE_ACCOUNT: `${API_BASE_PATH}/users/me`,
  AVATAR: (userId?: string | number) => 
    userId ? `${API_BASE_PATH}/users/${userId}/avatar` : `${API_BASE_PATH}/users/me/avatar`,
} as const;

/**
 * Teacher Application endpoints
 */
export const TEACHER_APPLICATION_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/teacher-application`,
  SUBMIT: `${API_BASE_PATH}/teacher-application/submit`,
  MY_APPLICATION: `${API_BASE_PATH}/teacher-application/my-application`,
  TRIAL_STATUS: `${API_BASE_PATH}/teacher-application/trial-status`,
} as const;

/**
 * File upload endpoints
 */
export const UPLOAD_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/upload`,
  IMAGE: `${API_BASE_PATH}/upload/image`,
  ICON: `${API_BASE_PATH}/upload/icon`,
  DOCUMENT: `${API_BASE_PATH}/upload/document`,
  DELETE: `${API_BASE_PATH}/upload`,
} as const;

/**
 * Course endpoints (for future use)
 */
export const COURSE_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/courses`,
  LIST: `${API_BASE_PATH}/courses`,
  CREATE: `${API_BASE_PATH}/courses`,
  UPDATE: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}`,
  ARCHIVE: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/archive`,
  PUBLISH: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/publish`,
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
  INSTRUCTOR_STATS: (instructorId: string | number) =>
    `${API_BASE_PATH}/courses/instructors/${instructorId}/stats`,
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
 * Teacher Portal endpoints - for teacher dashboard & course management
 * Uses existing endpoints but organized for teacher portal use
 */
export const TEACHER_PORTAL_ENDPOINTS = {
  // Stats - uses COURSE_ENDPOINTS.INSTRUCTOR_STATS
  MY_STATS: (instructorId: string | number) =>
    `${API_BASE_PATH}/courses/instructors/${instructorId}/stats`,
  
  // My Courses - uses COURSE_ENDPOINTS.BY_INSTRUCTOR
  MY_COURSES: (instructorId: string | number) =>
    `${API_BASE_PATH}/courses/instructor/${instructorId}`,
  
  // Lightweight course picker options (id + title) for filter dropdowns
  COURSE_PICKER: (instructorId: string | number) =>
    `${API_BASE_PATH}/courses/instructor/${instructorId}/picker`,
  
  // Course CRUD
  COURSE_CREATE: `${API_BASE_PATH}/courses`,
  COURSE_UPDATE: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}`,
  COURSE_ARCHIVE: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/archive`,
  COURSE_DETAIL: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}`,
  COURSE_PUBLISH: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/publish`,
  
  // Sections
  SECTIONS: (courseId: string | number) => `${API_BASE_PATH}/sections/courses/${courseId}`,
  SECTIONS_DETAIL: (courseId: string | number) => `${API_BASE_PATH}/sections/courses/${courseId}/detail`,
  SECTION_CREATE: (courseId: string | number) => `${API_BASE_PATH}/sections/courses/${courseId}`,
  SECTION_UPDATE: (sectionId: string | number) => `${API_BASE_PATH}/sections/${sectionId}`,
  SECTION_DELETE: (sectionId: string | number) => `${API_BASE_PATH}/sections/${sectionId}`,
  SECTION_REORDER: (courseId: string | number) => `${API_BASE_PATH}/sections/courses/${courseId}/reorder`,
  
  // Lessons
  LESSONS: (sectionId: string | number) => `${API_BASE_PATH}/lessons/sections/${sectionId}`,
  LESSON_CREATE: (sectionId: string | number) => `${API_BASE_PATH}/lessons/sections/${sectionId}`,
  LESSON_UPDATE: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}`,
  LESSON_DELETE: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}`,
  LESSON_REORDER: (sectionId: string | number) => `${API_BASE_PATH}/lessons/sections/${sectionId}/reorder`,

  // Lesson Video Upload
  LESSON_VIDEO_SIGNATURE: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video/signature`,
  LESSON_VIDEO_CONFIRM: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video`,
  LESSON_VIDEO_DELETE: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video`,
  LESSON_VIDEO_RESET: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video/reset`,

  // Lesson Resource Upload
  LESSON_RESOURCE_DELETE: `${API_BASE_PATH}/lessons/resource-uploads`,

  // Course Students (enrollments)
  COURSE_STUDENTS: (courseId: string | number) => `${API_BASE_PATH}/enrollments/courses/${courseId}`,
  
  // Course Reviews
  COURSE_REVIEWS: (courseId: string | number) => `${API_BASE_PATH}/reviews/courses/${courseId}/all`,
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
  CREATE: `${API_BASE_PATH}/categories`,
  UPDATE: (categoryId: string | number) => `${API_BASE_PATH}/categories/${categoryId}`,
  DELETE: (categoryId: string | number) => `${API_BASE_PATH}/categories/${categoryId}`,
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
  MY_STATS: `${API_BASE_PATH}/enrollments/my-stats`,
  CHECK: (courseId: string | number) => `${API_BASE_PATH}/enrollments/check/${courseId}`,
  MY_FOR_COURSE: (courseId: string | number) => `${API_BASE_PATH}/enrollments/course/${courseId}`,
  ENROLLED_IN: `${API_BASE_PATH}/enrollments/enrolled`,
  STUDENT: (studentId: string | number) => `${API_BASE_PATH}/enrollments/student/${studentId}`,
  COURSE: (courseId: string | number) => `${API_BASE_PATH}/enrollments/courses/${courseId}`,
  SUSPEND: (enrollmentId: string | number) => `${API_BASE_PATH}/enrollments/${enrollmentId}/suspend`,
  ACTIVATE: (enrollmentId: string | number) => `${API_BASE_PATH}/enrollments/${enrollmentId}/activate`,
  REPORT_TO_ADMIN: (enrollmentId: string | number) => `${API_BASE_PATH}/enrollments/${enrollmentId}/report-to-admin`,
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
  VIDEO_SIGNATURE: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video/signature`,
  VIDEO_CONFIRM: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video`,
  VIDEO_DELETE: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video`,
  VIDEO_RESET: (lessonId: string | number) => `${API_BASE_PATH}/lessons/${lessonId}/video/reset`,
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

// Instructor Review Endpoints
export const INSTRUCTOR_REVIEW_ENDPOINTS = {
  // Get all reviews for instructor's courses
  MY_REVIEWS: `${API_BASE_PATH}/reviews/instructor/my-reviews`,
  
  // Get reviews stats
  MY_REVIEWS_STATS: `${API_BASE_PATH}/reviews/instructor/my-reviews/stats`,
  
  // Get courses with reviews (for filter dropdown)
  MY_REVIEWS_COURSES: `${API_BASE_PATH}/reviews/instructor/my-reviews/courses`,
  
  // Reply to a review
  REPLY: (reviewId: number) => `${API_BASE_PATH}/reviews/${reviewId}/reply`,
  
  // Delete reply
  DELETE_REPLY: (reviewId: number) => `${API_BASE_PATH}/reviews/${reviewId}/reply`,
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
 * Cart endpoints
 */
export const CART_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/cart`,
  ITEMS: `${API_BASE_PATH}/cart/items`,
  ITEM: (courseId: string | number) => `${API_BASE_PATH}/cart/items/${courseId}`,
  COUNT: `${API_BASE_PATH}/cart/count`,
  CHECK: (courseId: string | number) => `${API_BASE_PATH}/cart/check/${courseId}`,
} as const;

/**
 * Checkout endpoints
 */
export const CHECKOUT_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/checkout`,
  PREVIEW: `${API_BASE_PATH}/checkout/preview`,
  DIRECT_PREVIEW: `${API_BASE_PATH}/checkout/direct/preview`,
  DIRECT: `${API_BASE_PATH}/checkout/direct`,
  CAPTURE: `${API_BASE_PATH}/checkout/capture`,
  CANCEL: `${API_BASE_PATH}/checkout/cancel`,
  STATUS: (orderId: string | number) => `${API_BASE_PATH}/checkout/status/${orderId}`,
} as const;

/**
 * Order endpoints
 */
export const ORDER_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/orders`,
  DETAIL: (orderId: string | number) => `${API_BASE_PATH}/orders/${orderId}`,
  BY_NUMBER: (orderNumber: string) => `${API_BASE_PATH}/orders/number/${orderNumber}`,
  CANCEL: (orderId: string | number) => `${API_BASE_PATH}/orders/${orderId}/cancel`,
  REFUND: (orderId: string | number) => `${API_BASE_PATH}/orders/${orderId}/refund`,
  COUNT: `${API_BASE_PATH}/orders/count`,
} as const;

/**
 * Invoice endpoints
 */
export const INVOICE_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/invoices`,
  DETAIL: (invoiceId: string | number) => `${API_BASE_PATH}/invoices/${invoiceId}`,
  BY_NUMBER: (invoiceNumber: string) => `${API_BASE_PATH}/invoices/number/${invoiceNumber}`,
  BY_ORDER: (orderId: string | number) => `${API_BASE_PATH}/invoices/order/${orderId}`,
  DOWNLOAD: (invoiceId: string | number) => `${API_BASE_PATH}/invoices/${invoiceId}/download`,
  VIEW: (invoiceId: string | number) => `${API_BASE_PATH}/invoices/${invoiceId}/view`,
} as const;

/**
 * Earning endpoints (Teacher)
 */
export const EARNING_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/teacher/earnings`,
  DETAIL: (earningId: string | number) => `${API_BASE_PATH}/teacher/earnings/${earningId}`,
  SUMMARY: `${API_BASE_PATH}/teacher/earnings/summary`,
  MONTHLY: `${API_BASE_PATH}/teacher/earnings/monthly`,
  BY_COURSE: `${API_BASE_PATH}/teacher/earnings/by-course`,
  EXPORT: `${API_BASE_PATH}/teacher/earnings/export`,
} as const;

/**
 * Teacher Analytics endpoints
 */
export const TEACHER_ANALYTICS_ENDPOINTS = {
  ANALYTICS: `${API_BASE_PATH}/teacher/analytics`,
} as const;

/**
 * Refund endpoints
 */
export const REFUND_ENDPOINTS = {
  REQUEST: `${API_BASE_PATH}/payments/refunds/request`,
  POLICY: `${API_BASE_PATH}/payments/refunds/policy`,
  MY_REFUNDS: `${API_BASE_PATH}/payments/refunds/my-refunds`,
  DETAIL: (refundId: string | number) => `${API_BASE_PATH}/payments/refunds/${refundId}`,
  BY_ORDER: (orderId: string | number) => `${API_BASE_PATH}/payments/refunds/by-order/${orderId}`,
  ADMIN_PENDING: `${API_BASE_PATH}/payments/refunds/admin/pending`,
  ADMIN_APPROVE: (refundId: string | number) => `${API_BASE_PATH}/payments/refunds/admin/${refundId}/approve`,
  ADMIN_REJECT: (refundId: string | number) => `${API_BASE_PATH}/payments/refunds/admin/${refundId}/reject`,
  ADMIN_CONFIRM_MANUAL: (refundId: string | number) => `${API_BASE_PATH}/payments/refunds/admin/${refundId}/confirm-manual-refund`,
} as const;

/**
 * Payout endpoints
 */
export const PAYOUT_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/instructors/payouts`,
  DETAIL: (payoutId: string | number) => `${API_BASE_PATH}/instructors/payouts/${payoutId}`,
  SUMMARY: `${API_BASE_PATH}/instructors/payouts/summary`,
  SETTINGS: `${API_BASE_PATH}/instructors/payouts/payment-settings`,
  ADMIN_PENDING: `${API_BASE_PATH}/instructors/payouts/admin/pending`,
  ADMIN_ALL: `${API_BASE_PATH}/instructors/payouts/admin`,
  ADMIN_CREATE: `${API_BASE_PATH}/instructors/payouts/admin`,
  ADMIN_UPDATE: (payoutId: string | number) => `${API_BASE_PATH}/instructors/payouts/admin/${payoutId}`,
  ADMIN_PROCESS: (payoutId: string | number) => `${API_BASE_PATH}/instructors/payouts/admin/${payoutId}/process`,
  ADMIN_CONFIRM_MANUAL: (payoutId: string | number) => `${API_BASE_PATH}/instructors/payouts/admin/${payoutId}/confirm-manual-payout`,
} as const;

/**
 * Admin endpoints (for future use)
 */
export const ADMIN_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/admin`,

  // Dashboard
  DASHBOARD_STATS: `${API_BASE_PATH}/admin/dashboard/stats`,

  // User Management (Auth Service)
  USERS: `${API_BASE_PATH}/admin/users`,
  USERS_BY_ROLE: (roleName: string) => `${API_BASE_PATH}/admin/users/role/${roleName}`,
  USER_ROLE_STATS: (roleName: string) => `${API_BASE_PATH}/admin/users/role/${roleName}/stats`,
  USER_DETAIL: (userId: string | number) => `${API_BASE_PATH}/admin/users/${userId}`,
  USER_CREATE_TEACHER: `${API_BASE_PATH}/admin/users/teacher`,
  USER_CREATE_ADMIN: `${API_BASE_PATH}/admin/users/admin`,
  USER_UPDATE_ROLES: (userId: string | number) =>
    `${API_BASE_PATH}/admin/users/${userId}/role`,
  USER_TOGGLE_STATUS: (userId: string | number) =>
    `${API_BASE_PATH}/admin/users/${userId}/status`,
  USER_DELETE: (userId: string | number) => `${API_BASE_PATH}/admin/users/${userId}`,

  // Teacher applications
  APPLICATIONS: `${API_BASE_PATH}/admin/users/applications`,
  APPLICATION_STATS: `${API_BASE_PATH}/admin/users/applications/stats`,
  APPLICATION_DETAIL: (applicationId: string | number) =>
    `${API_BASE_PATH}/admin/users/applications/${applicationId}`,
  APPLICATION_REVIEW: (applicationId: string | number) =>
    `${API_BASE_PATH}/admin/users/applications/${applicationId}/review`,

  // Trial teachers
  TRIAL_TEACHERS: `${API_BASE_PATH}/admin/users/trial-teachers`,
  TRIAL_TEACHER_UPGRADE: (userId: string | number) =>
    `${API_BASE_PATH}/admin/users/trial-teachers/${userId}/upgrade`,

  // Courses Management
  COURSES: `${API_BASE_PATH}/admin/courses`,
  COURSE_CREATE: `${API_BASE_PATH}/admin/courses`,
  COURSE_DETAIL: (courseId: string | number) => `${API_BASE_PATH}/admin/courses/${courseId}`,
  COURSE_UPDATE: (courseId: string | number) => `${API_BASE_PATH}/admin/courses/${courseId}`,

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

  // Enrollment Reports
  ENROLLMENT_REPORTS: `${API_BASE_PATH}/enrollments/reports`,
  ENROLLMENT_REPORT_STATS: `${API_BASE_PATH}/enrollments/reports/stats`,
  ENROLLMENT_REPORT_APPROVE: (id: string | number) => `${API_BASE_PATH}/enrollments/reports/${id}/approve`,
  ENROLLMENT_REPORT_REJECT: (id: string | number) => `${API_BASE_PATH}/enrollments/reports/${id}/reject`,
} as const;

/**
 * Certificate endpoints
 */
export const CERTIFICATE_ENDPOINTS = {
  REGENERATE: (enrollmentId: number | string) =>
    `${API_BASE_PATH}/certificates/${enrollmentId}/regenerate`,
  VERIFY: (reference: string) =>
    `${API_BASE_PATH}/certificates/verify/${reference}`,
  DOWNLOAD: (enrollmentId: number | string) =>
    `${API_BASE_PATH}/certificates/${enrollmentId}/download`,
} as const;

/**
 * AI endpoints
 */
export const AI_ENDPOINTS = {
  QUIZ_GENERATE: `${API_BASE_PATH}/ai/quizzes/generate`,
  JOB_STATUS: (jobId: number) => `${API_BASE_PATH}/ai/jobs/${jobId}`,
  QUIZZES_BY_LESSON: (lessonId: number) => `${API_BASE_PATH}/ai/quizzes/lesson/${lessonId}`,
  QUIZ_FOR_STUDENT: (lessonId: number) => `${API_BASE_PATH}/ai/quizzes/lesson/${lessonId}/take`,
  SUBMIT_ATTEMPT: `${API_BASE_PATH}/ai/quizzes/attempts`,
  MY_ATTEMPTS: (lessonId: number) => `${API_BASE_PATH}/ai/quizzes/lesson/${lessonId}/my-attempts`,
  UPDATE_QUIZ_QUESTIONS: (quizId: number) => `${API_BASE_PATH}/ai/quizzes/${quizId}/questions`,
  SUMMARY_BY_LESSON: (lessonId: number) => `${API_BASE_PATH}/ai/summaries/lesson/${lessonId}`,
  CHAT: (courseId: number) => `${API_BASE_PATH}/ai/chat/courses/${courseId}`,
  CHAT_STREAM: (courseId: number) => `${API_BASE_PATH}/ai/chat/courses/${courseId}/stream`,
  TRANSCRIBE_LESSON: (lessonId: number) =>
    `${API_BASE_PATH}/ai/transcribe/lessons/${lessonId}`,
} as const;

/**
 * Helper function to build full URL with base API URL
 * Uses environment configuration for default API URL
 */
export const buildApiUrl = (
  endpoint: string,
  baseUrl?: string
): string => {
  const apiBase = baseUrl || API_URL;
  
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
