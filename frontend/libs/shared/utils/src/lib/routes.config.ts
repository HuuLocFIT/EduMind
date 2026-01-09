/**
 * Routes Configuration
 * 
 * Centralized management of all application routes.
 * This ensures consistency, type safety, and easier maintenance across apps.
 */

/**
 * Admin App Routes
 */
export const ADMIN_ROUTES = {
  // Base paths
  ROOT: '/',
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  
  // Auth routes
  AUTH_LOGIN: '/auth/login',
  
  // Dashboard routes (for future use)
  DASHBOARD_HOME: '/dashboard',
  
  // Feature routes (for future use)
  TEACHERS: '/teachers',
  TEACHER_APPLICATIONS: '/teachers/applications',
  TRIAL_TEACHERS: '/teachers/trial',
  STUDENTS: '/students',
  COURSES: '/courses',
  CATEGORIES: '/categories',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const;

/**
 * User App Routes
 */
export const USER_ROUTES = {
  // Base paths
  ROOT: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  
  // Auth routes
  AUTH_LOGIN: '/login',
  AUTH_SIGNUP: '/signup',
  AUTH_LOGOUT: '/logout',
  
  // Password management
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Email verification
  VERIFY_EMAIL: '/verify-email',
  RESEND_VERIFICATION: '/resend-verification',
  
  // OAuth2
  OAUTH2_REDIRECT: '/oauth2/redirect',
  OAUTH2_CALLBACK: '/oauth2/callback',
  
  // 2FA
  TWO_FA_SETUP: '/2fa/setup',
  TWO_FA_VERIFY: '/2fa/verify',
  TWO_FA_RECOVERY: '/2fa-recovery',
  
  // Profile
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  PROFILE_SETTINGS: '/profile/settings',
  
  // Courses (for future use)
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:courseId',
  MY_COURSES: '/my-courses',
  
  // Learning (for future use)
  LEARNING: '/learning',
  LEARNING_COURSE: '/learning/:courseId',

  // Certificates
  CERTIFICATES: '/certificates',

  // Wishlist
  WISHLIST: '/wishlist',

  // Teacher Application
  TEACHER_APPLICATION: '/teacher/application',
  TEACHER_APPLICATION_STATUS: '/teacher/application/status',

  // Cart & Checkout
  CART: '/cart',
  CHECKOUT: '/checkout',
  CHECKOUT_SUCCESS: '/checkout/success',
  CHECKOUT_FAILED: '/checkout/failed',

  // Orders
  ORDERS: '/orders',
  ORDER_DETAIL: '/orders/:orderId',

  // Invoices
  INVOICES: '/invoices',
  INVOICE_DETAIL: '/invoices/:invoiceId',
  
  // Not found
  NOT_FOUND: '/404',
} as const;

/**
 * Teacher Portal Routes (within User App)
 */
export const TEACHER_ROUTES = {
  // Base
  ROOT: '/teacher',
  DASHBOARD: '/teacher/dashboard',
  
  // Course Management
  COURSES: '/teacher/courses',
  COURSE_CREATE: '/teacher/courses/create',
  COURSE_EDIT: '/teacher/courses/:courseId/edit',
  COURSE_DETAIL: '/teacher/courses/:courseId',
  COURSE_CURRICULUM: '/teacher/courses/:courseId/curriculum',
  
  // Students
  STUDENTS: '/teacher/students',
  COURSE_STUDENTS: '/teacher/courses/:courseId/students',
  
  // Reviews
  REVIEWS: '/teacher/reviews',
  
  // Analytics
  ANALYTICS: '/teacher/analytics',
  
  // Settings
  SETTINGS: '/teacher/settings',
  PROFILE: '/teacher/profile',
} as const;

/**
 * Helper function to build route with query parameters
 */
export const buildRoute = (
  route: string,
  params?: Record<string, string | number | undefined>
): string => {
  if (!params) return route;
  
  const queryString = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  return queryString ? `${route}?${queryString}` : route;
};

/**
 * Helper function to build route with path parameters
 */
export const buildRouteWithParams = (
  template: string,
  params: Record<string, string | number>
): string => {
  let route = template;
  Object.entries(params).forEach(([key, value]) => {
    route = route.replace(`:${key}`, String(value));
    route = route.replace(`{${key}}`, String(value));
  });
  return route;
};

/**
 * Type-safe route navigation helper for Angular
 */
export const getAdminRoute = (route: keyof typeof ADMIN_ROUTES): string => {
  return ADMIN_ROUTES[route];
};

/**
 * Type-safe route navigation helper for React
 */
export const getUserRoute = (route: keyof typeof USER_ROUTES): string => {
  return USER_ROUTES[route];
};

/**
 * Helper functions for dynamic routes
 */
export const UserRouteHelpers = {
  courseDetail: (courseId: string | number) => `/courses/${courseId}`,
  learningCourse: (courseId: string | number) => `/learning/${courseId}`,
} as const;

/**
 * Helper functions for teacher routes
 */
export const TeacherRouteHelpers = {
  courseDetail: (courseId: string | number) => `/teacher/courses/${courseId}`,
  courseEdit: (courseId: string | number, tab?: string) => `/teacher/courses/${courseId}/edit${tab ? `?tab=${tab}` : ''}`,
  courseCurriculum: (courseId: string | number) => `/teacher/courses/${courseId}/curriculum`,
  courseStudents: (courseId: string | number) => `/teacher/courses/${courseId}/students`,
} as const;

/**
 * Type-safe route navigation helper for Teacher
 */
export const getTeacherRoute = (route: keyof typeof TEACHER_ROUTES): string => {
  return TEACHER_ROUTES[route];
};

