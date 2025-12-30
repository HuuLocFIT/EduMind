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
  detail: (courseId: string | number) => ['courses', courseId] as const,
  popular: (page: number, size: number) => 
    ['courses', 'popular', page, size] as const,
  topRated: (page: number, size: number) => 
    ['courses', 'top-rated', page, size] as const,
  filtered: (params: {
    filterType: string;
    page: number;
    size: number;
    categoryId?: number | null;
    level?: string | null;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy: string;
  }) => [
    'courses',
    params.filterType,
    params.page,
    params.size,
    params.categoryId,
    params.level,
    params.keyword,
    params.minPrice,
    params.maxPrice,
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
} as const;

