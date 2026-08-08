export const hasPositiveCourseMetric = (
  value: number | null | undefined
): value is number => typeof value === "number" && value > 0;
