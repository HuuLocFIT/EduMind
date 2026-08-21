export const ContentType = {
  VIDEO: "VIDEO",
  ARTICLE: "ARTICLE",
  QUIZ: "QUIZ",
  RESOURCE: "RESOURCE",
} as const;

export const CourseLevel = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
  ALL_LEVELS: "ALL_LEVELS",
} as const;

export const CourseStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const EnrollmentStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  SUSPENDED: "SUSPENDED",
  EXPIRED: "EXPIRED",
  DROPPED: "DROPPED",
} as const;

export const VideoUploadStatus = {
  NONE: "NONE",
  UPLOADING: "UPLOADING",
  READY: "READY",
  FAILED: "FAILED",
} as const;
