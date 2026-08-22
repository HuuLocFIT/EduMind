import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowseCoursesSkeleton } from "./BrowseCoursesSkeleton";

describe("BrowseCoursesSkeleton", () => {
  it("mirrors the responsive page shell and course count", () => {
    render(<BrowseCoursesSkeleton />);

    const status = screen.getByRole("status", { name: "Loading courses" });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByTestId("course-card-skeleton")).toHaveLength(12);

    expect(screen.getByTestId("browse-mobile-filter-skeleton")).toHaveClass(
      "lg:hidden",
    );
    expect(screen.getByTestId("browse-desktop-sidebar-skeleton")).toHaveClass(
      "hidden",
      "lg:block",
      "w-64",
    );
    expect(screen.getByTestId("browse-category-search-skeleton").firstElementChild).toHaveClass(
      "h-[38px]",
      "w-full",
    );
    expect(screen.getByTestId("browse-results-header-skeleton")).toHaveClass(
      "flex-col",
      "sm:flex-row",
    );
    expect(screen.queryByTestId("browse-active-filter-skeletons")).not.toBeInTheDocument();
  });

  it("renders the requested number of active-filter placeholders", () => {
    render(<BrowseCoursesSkeleton activeFilterGroupCount={3} />);
    expect(
      screen.getByTestId("browse-active-filter-skeletons").children,
    ).toHaveLength(3);
  });
});
