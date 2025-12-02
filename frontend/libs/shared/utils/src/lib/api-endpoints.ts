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
  FORGOT_PASSWORD: `${API_BASE_PATH}/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_PATH}/auth/reset-password`,
  
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
  CHANGE_PASSWORD: `${API_BASE_PATH}/users/me/password`,
  AVATAR: (userId?: string | number) => 
    userId ? `${API_BASE_PATH}/users/${userId}/avatar` : `${API_BASE_PATH}/users/me/avatar`,
} as const;

/**
 * Course endpoints (for future use)
 */
export const COURSE_ENDPOINTS = {
  BASE: `${API_BASE_PATH}/courses`,
  LIST: `${API_BASE_PATH}/courses`,
  DETAIL: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}`,
  ENROLL: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/enroll`,
  UNENROLL: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/unenroll`,
  MY_COURSES: `${API_BASE_PATH}/courses/my-courses`,
  PROGRESS: (courseId: string | number) => `${API_BASE_PATH}/courses/${courseId}/progress`,
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

