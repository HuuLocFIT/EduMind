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

const jsonResponse = (data) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

function responseForApi(pathname) {
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
