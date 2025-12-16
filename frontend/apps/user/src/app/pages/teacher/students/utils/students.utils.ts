import type { EnrollmentResponse } from "@edumind/shared-types";

export const formatDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTimeAgo = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(value);
};

export const isPaidCourse = (enrollment: EnrollmentResponse): boolean => {
  return (
    enrollment.courseIsPaid ??
    (enrollment.coursePrice != null && enrollment.coursePrice > 0)
  );
};

export const exportStudentsToCsv = (
  enrollments: EnrollmentResponse[],
  courseId?: number
): void => {
  const headers = [
    "Student ID",
    "Student Name",
    "Email",
    "Course",
    "Course Type",
    "Progress",
    "Status",
    "Enrolled At",
    "Last Accessed At",
  ];

  const rows = enrollments.map((e) => {
    const paid = isPaidCourse(e);
    return [
      e.studentId,
      e.studentName || `Student #${e.studentId}`,
      e.studentEmail || "",
      e.courseTitle,
      paid ? "Paid" : "Free",
      `${e.progressPercentage ?? 0}%`,
      e.status,
      formatDate(e.enrolledAt),
      e.lastAccessedAt ? formatDate(e.lastAccessedAt) : "Never",
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(String).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `course-${courseId ?? "students"}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
