import { describe, expect, it } from "vitest";
import { hasPositiveCourseMetric } from "./course-detail.utils";

describe("hasPositiveCourseMetric", () => {
  it.each([undefined, null, 0, -1])(
    "does not render an unavailable metric represented by %s",
    (value) => {
      expect(hasPositiveCourseMetric(value)).toBe(false);
    }
  );

  it("renders a positive metric", () => {
    expect(hasPositiveCourseMetric(1)).toBe(true);
  });
});
