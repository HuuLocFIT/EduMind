import type { CourseDetailResponse } from '@edumind/shared-types';
import { CourseStatus } from "@edumind/shared-constants";
import { stripHtml } from "@edumind/shared-utils";

const sanitizeDescription = (course: CourseDetailResponse, maxLength = 200) => {
  if (course.shortDescription) return stripHtml(course.shortDescription).substring(0, maxLength);
  if (course.description) return stripHtml(course.description).substring(0, maxLength);
  return '';
};

export const buildCourseJsonLd = (course: CourseDetailResponse, canonicalUrl?: string) => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: course.title,
  description: sanitizeDescription(course, 200),
  ...(canonicalUrl && { url: canonicalUrl }),
  provider: {
    '@type': 'Organization',
    name: 'EduMind',
    sameAs: 'https://edumind.nguyenloc.dev',
  },
  ...(course.price !== undefined && {
    offers: {
      '@type': 'Offer',
      price: course.effectivePrice ?? course.discountPrice ?? course.price,
      priceCurrency: 'USD',
      availability: course.status === CourseStatus.PUBLISHED
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }),
  ...(course.durationHours && {
    timeRequired: `PT${course.durationHours}H`,
  }),
  author: { '@type': 'Person', name: course.instructorName || 'Instructor' },
  ...(course.thumbnailUrl && {
    image: course.thumbnailUrl,
  }),
  ...(course.averageRating && (course.totalReviews ?? 0) > 0 && {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: course.averageRating,
      bestRating: 5,
      ratingCount: course.totalReviews,
    },
  }),
});
