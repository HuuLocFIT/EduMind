'use strict';

const timestamp = '2026-01-01T00:00:00.000Z';

const course = {
  id: 9001,
  title: 'Accessible Web Foundations',
  slug: 'pa11y-accessibility-fixture',
  description:
    '<p>Learn semantic HTML, keyboard navigation, and accessible forms.</p>',
  shortDescription: 'A deterministic course used only by local accessibility scans.',
  instructorId: 7001,
  instructorName: 'EduMind Accessibility Team',
  category: {
    id: 501,
    name: 'Web Development',
    slug: 'web-development',
    description: 'Web development courses',
    iconUrl: null,
    isActive: true,
    courseCount: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  price: 49,
  currency: 'USD',
  discountPrice: null,
  effectivePrice: 49,
  thumbnailUrl: null,
  previewVideoUrl: null,
  level: 'BEGINNER',
  language: 'English',
  durationHours: 2,
  status: 'PUBLISHED',
  publishedAt: timestamp,
  hasCertificate: true,
  hasSubtitles: true,
  totalLessons: 0,
  totalStudents: 25,
  averageRating: 4.8,
  totalReviews: 0,
  sections: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

const courseSummary = {
  ...course,
  categoryId: course.category.id,
  categoryName: course.category.name,
};
delete courseSummary.category;
delete courseSummary.description;
delete courseSummary.sections;

const pagedCourses = {
  status: 200,
  success: true,
  data: [courseSummary],
  pagination: {
    page: 0,
    size: 12,
    totalElements: 1,
    totalPages: 1,
    first: true,
    last: true,
    hasNext: false,
    hasPrevious: false,
  },
};

// Deterministic My Learning / Course Player fixture — reuses the same
// course as the course-detail route so both routes stay consistent.
const learningSections = [
  {
    id: 9101,
    courseId: course.id,
    title: 'Introduction',
    description: null,
    orderIndex: 0,
    lessonCount: 1,
    totalDurationMinutes: 5,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const learningLessons = [
  {
    id: 9201,
    courseId: course.id,
    sectionId: 9101,
    title: 'Welcome',
    description: null,
    contentType: 'ARTICLE',
    videoUrl: null,
    videoDuration: null,
    videoUploadStatus: 'NONE',
    videoPublicId: null,
    videoStreamUrl: null,
    video480pUrl: null,
    videoCaptionUrl: null,
    articleContent: '<p>Welcome to this deterministic accessibility-scan lesson.</p>',
    resources: [],
    isPreview: false,
    isMandatory: true,
    orderIndex: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const learningEnrollmentId = 9301;
const learningEnrollment = {
  id: learningEnrollmentId,
  courseId: course.id,
  courseTitle: course.title,
  courseSlug: course.slug,
  studentId: 99001,
  progressPercentage: 0,
  completedLessons: 0,
  totalLessons: learningLessons.length,
  status: 'ACTIVE',
  enrolledAt: timestamp,
  completedAt: null,
  lastAccessedAt: timestamp,
  expiresAt: null,
};

// Deterministic Cart / Checkout / SePay QR fixture — reuses the same course
// as an in-cart item so Cart, Checkout and their price breakdown all agree.
const cartItem = {
  id: 9401,
  courseId: course.id,
  courseTitle: course.title,
  courseSlug: course.slug,
  courseThumbnailUrl: null,
  instructorName: course.instructorName,
  instructorId: course.instructorId,
  originalPrice: course.price,
  discountAmount: 0,
  effectivePrice: course.effectivePrice,
  currency: course.currency,
  level: course.level,
  totalLessons: learningLessons.length,
  averageRating: course.averageRating,
  totalReviews: course.totalReviews,
  addedAt: timestamp,
  isAvailable: true,
  unavailableReason: null,
};

const cartResponse = {
  id: 1,
  userId: 99001,
  items: [cartItem],
  itemCount: 1,
  subtotal: cartItem.originalPrice,
  discountTotal: cartItem.discountAmount,
  totalAmount: cartItem.effectivePrice,
  currency: cartItem.currency,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const checkoutPreview = {
  items: [{...cartItem, isFree: false}],
  itemCount: 1,
  subtotal: cartItem.originalPrice,
  discountTotal: cartItem.discountAmount,
  taxAmount: 0,
  taxRate: 0,
  totalAmount: cartItem.effectivePrice,
  currency: cartItem.currency,
  isFreeCheckout: false,
  requiresPayment: true,
  availablePaymentMethods: ['PAYPAL', 'SEPAY'],
  isValid: true,
  validationErrors: [],
  warnings: [],
  cartSignature: 'pa11y-cart-signature',
};

const jsonResponse = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

function responseForApi(pathname) {
  if (pathname.endsWith('/cart/count')) {
    return jsonResponse({status: 200, success: true, data: cartResponse.itemCount});
  }
  if (pathname.endsWith('/cart')) {
    return jsonResponse({status: 200, success: true, data: cartResponse});
  }
  if (pathname.endsWith('/checkout/preview')) {
    return jsonResponse({status: 200, success: true, data: checkoutPreview});
  }
  if (/\/checkout\/status\/\d+$/.test(pathname)) {
    return jsonResponse({
      status: 200,
      success: true,
      data: {
        success: true,
        message: 'Awaiting payment',
        orderId: 8001,
        orderNumber: 'PA11Y-ORDER-SEPAY',
        orderStatus: 'PENDING',
        totalAmount: checkoutPreview.totalAmount,
        currency: checkoutPreview.currency,
        paymentMethod: 'SEPAY',
        enrolledCourseIds: [],
      },
    });
  }
  // Must be checked before the generic `/courses` fallback below, whose
  // substring match would otherwise swallow `/sections/courses/:id` and
  // `/lessons/courses/:id`.
  if (pathname.endsWith(`/sections/courses/${course.id}`)) {
    return jsonResponse({status: 200, success: true, data: learningSections});
  }
  if (pathname.endsWith(`/lessons/courses/${course.id}`)) {
    return jsonResponse({status: 200, success: true, data: learningLessons});
  }
  if (pathname.endsWith('/enrollments/my-stats')) {
    return jsonResponse({
      status: 200,
      success: true,
      data: {total: 1, active: 1, completed: 0, started: 1},
    });
  }
  if (pathname.endsWith('/enrollments/my-enrollments')) {
    return jsonResponse({
      status: 200,
      success: true,
      data: [learningEnrollment],
      pagination: {page: 0, size: 12, totalElements: 1, totalPages: 1},
    });
  }
  if (pathname.endsWith(`/enrollments/course/${course.id}`)) {
    return jsonResponse({status: 200, success: true, data: learningEnrollment});
  }
  if (pathname.endsWith(`/enrollments/check/${course.id}`)) {
    return jsonResponse({status: 200, success: true, data: true});
  }
  if (pathname.endsWith(`/progress/enrollment/${learningEnrollmentId}`)) {
    return jsonResponse({status: 200, success: true, data: []});
  }
  if (pathname.includes('/ai/')) {
    return jsonResponse({status: 200, success: true, data: null});
  }
  if (pathname.endsWith('/courses/slug/pa11y-accessibility-fixture')) {
    return jsonResponse({status: 200, success: true, data: course});
  }
  if (/\/courses\/instructors\/\d+\/stats$/.test(pathname)) {
    return jsonResponse({
      status: 200,
      success: true,
      data: {
        instructorId: course.instructorId,
        instructorName: course.instructorName,
        totalCourses: 1,
        totalStudents: 25,
        averageRating: 4.8,
        totalReviews: 0,
      },
    });
  }
  if (/\/courses\/\d+\/reviews$/.test(pathname)) {
    return jsonResponse({
      status: 200,
      success: true,
      data: [],
      pagination: {page: 0, size: 10, totalElements: 0, totalPages: 0},
    });
  }
  if (pathname.includes('/courses')) {
    return jsonResponse(pagedCourses);
  }
  if (pathname.includes('/categories')) {
    return jsonResponse({status: 200, success: true, data: []});
  }

  // Public scans must never fall through to a mutable backend. Unknown API
  // reads receive an empty, successful fixture; writes are rejected by runner.
  return jsonResponse({status: 200, success: true, data: []});
}

module.exports = {responseForApi};
