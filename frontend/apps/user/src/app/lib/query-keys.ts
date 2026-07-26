/**
 * Query Key Factory
 * 
 * Centralized query keys for React Query to ensure consistency and type safety.
 * All query keys should be generated through these factory functions.
 */

// ============================================
// Enrollments
// ============================================
export const enrollmentsKeys = {
  all: ['enrollments'] as const,
  me: (userId?: number, page?: number, size?: number) => 
    ['enrollments', 'me', userId, page, size] as const,
  meByStatus: (
    userId?: number,
    status?: string,
    page?: number,
    size?: number
  ) => ['enrollments', 'me', userId, status, page, size] as const,
  completed: (userId?: number) => ['enrollments', 'completed', userId] as const,
  inProgress: (userId?: number, minProgress?: number) => 
    ['enrollments', 'in-progress', userId, minProgress] as const,
  course: (courseId: number, userId?: number) => 
    ['enrollments', 'courses', courseId, userId] as const,
  status: (courseId: number | string, userId?: number) =>
    ['enrollments', 'status', courseId, userId] as const,
  stats: (userId?: number) => ['enrollments', 'stats', userId] as const,
} as const;

// ============================================
// Courses
// ============================================
export const coursesKeys = {
  all: ['courses'] as const,
  detail: (slugOrId: string | number) => ['courses', String(slugOrId)] as const,
  popular: (page: number, size: number) => 
    ['courses', 'popular', page, size] as const,
  topRated: (page: number, size: number) => 
    ['courses', 'top-rated', page, size] as const,
  newest: (page: number, size: number) =>
    ['courses', 'newest', page, size] as const,
  filtered: (params: {
    filterType: string;
    page: number;
    size: number;
    categoryIds?: number[];
    levels?: string[];
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy: string;
  }) => [
    'courses',
    params.filterType,
    params.page,
    params.size,
    params.categoryIds,
    params.levels,
    params.keyword,
    params.minPrice,
    params.maxPrice,
    params.minRating,
    params.sortBy,
  ] as const,
  reviews: (courseId: string | number) => 
    ['courses', courseId, 'reviews'] as const,
} as const;

// ============================================
// Wishlist
// ============================================
export const wishlistKeys = {
  all: ['wishlist'] as const,
  user: (userId?: number) => ['wishlist', userId] as const,
  course: (courseId: string | number, userId?: number) => 
    ['wishlist', courseId, userId] as const,
  count: (userId?: number) => ['wishlist', 'count', userId] as const,
} as const;

// ============================================
// Categories
// ============================================
export const categoriesKeys = {
  all: ['categories'] as const,
  active: ['categories', 'active'] as const,
} as const;

// ============================================
// Instructors
// ============================================
export const instructorsKeys = {
  all: ['instructors'] as const,
  stats: (instructorId: number) => 
    ['instructor', instructorId, 'stats'] as const,
} as const;

// ============================================
// Teacher Courses
// ============================================
export const teacherCoursesKeys = {
  all: ['teacher-courses'] as const,
  list: (userId?: number, page?: number, size?: number) => 
    ['teacher-courses', userId, page, size] as const,
  detail: (courseId: string | number) => 
    ['teacher-courses', courseId] as const,
  sections: (courseId: string | number) => 
    ['teacher-courses', courseId, 'sections'] as const,
} as const;

// ============================================
// Teacher Applications
// ============================================
export const teacherApplicationKeys = {
  all: ['teacher-application'] as const,
  myApplication: (userId?: number) => 
    ['teacher-application', 'my-application', userId] as const,
  trialStatus: (userId?: number) => 
    ['teacher-application', 'trial-status', userId] as const,
} as const;

// ============================================
// Teacher Reviews
// ============================================
export const teacherReviewsKeys = {
  all: ['teacher-reviews'] as const,
  list: (params: {
    page?: number;
    size?: number;
    courseId?: number;
    rating?: number;
    hasReply?: boolean;
    sortBy?: string;
    sortDir?: string;
  }) => [
    'teacher-reviews',
    'list',
    params.page,
    params.size,
    params.courseId,
    params.rating,
    params.hasReply,
    params.sortBy,
    params.sortDir,
  ] as const,
  stats: ['teacher-reviews', 'stats'] as const,
  courses: ['teacher-reviews', 'courses'] as const,
} as const;

// ============================================
// Cart
// ============================================
export const cartKeys = {
  all: ['cart'] as const,
  items: ['cart', 'items'] as const,
  count: ['cart', 'count'] as const,
  check: (courseId: number) => ['cart', 'check', courseId] as const,
} as const;

// ============================================
// Orders
// ============================================
export const orderKeys = {
  all: ['orders'] as const,
  list: (params?: {
    status?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => ['orders', 'list', params] as const,
  detail: (orderId: number) => ['orders', 'detail', orderId] as const,
  byNumber: (orderNumber: string) => ['orders', 'number', orderNumber] as const,
  count: ['orders', 'count'] as const,
} as const;

// ============================================
// Invoices
// ============================================
export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => ['invoices', 'list', params] as const,
  detail: (invoiceId: number) => ['invoices', 'detail', invoiceId] as const,
  byNumber: (invoiceNumber: string) => ['invoices', 'number', invoiceNumber] as const,
  byOrder: (orderId: number) => ['invoices', 'order', orderId] as const,
} as const;

// ============================================
// Earnings (Teacher)
// ============================================
export const earningKeys = {
  all: ['earnings'] as const,
  list: (params?: {
    status?: string;
    courseId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => ['earnings', 'list', params] as const,
  detail: (earningId: number) => ['earnings', 'detail', earningId] as const,
  summary: (params?: { fromDate?: string; toDate?: string }) =>
    ['earnings', 'summary', params] as const,
  monthly: (months?: number) => ['earnings', 'monthly', months] as const,
  byCourse: (params?: { fromDate?: string; toDate?: string }) =>
    ['earnings', 'by-course', params] as const,
} as const;

// ============================================
// Refunds
// ============================================
export const refundKeys = {
  all: ['refunds'] as const,
  list: (params?: { page?: number; size?: number; sortBy?: string; sortOrder?: string }) =>
    ['refunds', 'list', params] as const,
  detail: (refundId: number) => ['refunds', 'detail', refundId] as const,
  policy: (orderId: number) => ['refunds', 'policy', orderId] as const,
} as const;

// ============================================
// Payouts (Teacher)
// ============================================
export const payoutKeys = {
  all: ['payouts'] as const,
  list: (params?: { page?: number; size?: number; sortBy?: string; sortOrder?: string }) =>
    ['payouts', 'list', params] as const,
  detail: (payoutId: number) => ['payouts', 'detail', payoutId] as const,
  summary: ['payouts', 'summary'] as const,
  settings: ['payouts', 'settings'] as const,
} as const;

// ============================================
// AI
// ============================================
export const aiKeys = {
  summary: (lessonId: number) => ['ai', 'summary', lessonId] as const,
} as const;

// ============================================
// Helper: Get all keys for a resource
// ============================================
export const queryKeys = {
  enrollments: enrollmentsKeys,
  courses: coursesKeys,
  wishlist: wishlistKeys,
  categories: categoriesKeys,
  instructors: instructorsKeys,
  teacherCourses: teacherCoursesKeys,
  teacherApplication: teacherApplicationKeys,
  teacherReviews: teacherReviewsKeys,
  cart: cartKeys,
  orders: orderKeys,
  invoices: invoiceKeys,
  earnings: earningKeys,
  refunds: refundKeys,
  payouts: payoutKeys,
   ai: aiKeys,
} as const;
