export const formatCourseLevel = (level?: string | null): string => {
  if (!level) return "";

  const normalized = level.trim().toUpperCase();
  if (normalized === "ALL_LEVEL" || normalized === "ALL_LEVELS") {
    return "All Levels";
  }

  return level
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
