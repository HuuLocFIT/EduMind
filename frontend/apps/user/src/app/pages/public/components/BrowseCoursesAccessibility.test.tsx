import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CourseResponse } from "@edumind/shared-types";
import { BrowseHeroSection } from "./BrowseHeroSection";
import { BrowseCourseList } from "./BrowseCourseList";
import { MobileFilterDrawer } from "./MobileFilterDrawer";
import { BrowseActiveFilters } from "./BrowseActiveFilters";

vi.mock("@edumind/user-ui", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("../../../components/course-module", () => ({
  CourseGrid: () => <div role="list" aria-label="Courses" />,
  CourseGridSkeleton: () => <div data-testid="course-grid-skeleton" />,
  CategoryFilter: () => <label>Category <input type="checkbox" /></label>,
}));

vi.mock("./PriceRangeSlider", () => ({ PriceRangeSlider: () => null }));

const listProps = {
  isFetching: false,
  isLoading: false,
  error: null,
  courses: [] as CourseResponse[],
  totalElements: 0,
  page: 0,
  pageSize: 12,
  totalPages: 1,
  sortBy: "latest",
  onSortChange: vi.fn(),
  onRefetch: vi.fn(),
  onPageChange: vi.fn(),
  handleCourseClick: vi.fn(),
  enrolledCourseIds: new Set<number>(),
  cartCourseIds: new Set<number>(),
  addingIds: new Set<number>(),
  enrollingIds: new Set<number>(),
  handleAddToCart: vi.fn(),
  handleGoToCourse: vi.fn(),
  handleEnrollFree: vi.fn(),
  activeFiltersCount: 0,
  onClearFilters: vi.fn(),
};

describe("Browse courses accessibility", () => {
  it("keeps a search label and exposes named submit and clear controls", async () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    const onClear = vi.fn();
    render(
      <BrowseHeroSection
        value="React"
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onClear={onClear}
      />
    );

    expect(screen.getByRole("textbox", { name: "Search courses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear course search" }));
    expect(onClear).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("updates search input without submitting until the form is committed", async () => {
    const onInputChange = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <BrowseHeroSection
        value=""
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onClear={vi.fn()}
      />
    );

    await userEvent.type(screen.getByRole("textbox", { name: "Search courses" }), "React");
    expect(onInputChange).toHaveBeenCalledTimes(5);
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <BrowseHeroSection
        value="React"
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onClear={vi.fn()}
      />
    );
    await userEvent.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("announces an empty result update and provides a recovery action", () => {
    render(
      <BrowseCourseList
        {...listProps}
        activeFiltersCount={2}
        resultsAnnouncement="0 courses found"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("0 courses found");
    expect(screen.getByRole("heading", { name: "No courses found" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear All Filters" })).toBeInTheDocument();
  });

  it("announces the visible result range as a sentence", () => {
    const course = { id: 13, title: "TypeScript", slug: "typescript" } as CourseResponse;
    render(
      <BrowseCourseList
        {...listProps}
        courses={[course]}
        totalElements={30}
        totalPages={3}
        page={1}
        resultsAnnouncement="Showing courses 13 through 24 of 30 courses found"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing courses 13 through 24 of 30 courses found"
    );
    expect(screen.getByText(/Showing 13-24/)).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the concise result count when all results fit on one page", () => {
    const course = { id: 1, title: "TypeScript", slug: "typescript" } as CourseResponse;
    render(
      <BrowseCourseList
        {...listProps}
        courses={[course]}
        totalElements={1}
        resultsAnnouncement="1 course found"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 course found");
    expect(document.getElementById("course-results-summary")).toHaveTextContent("1 course found");
    expect(screen.queryByText(/Showing 1-/)).not.toBeInTheDocument();
  });

  it("marks the current page and moves focus after settled results are requested", () => {
    const course = { id: 1, title: "React", slug: "react" } as CourseResponse;
    const { rerender } = render(
      <BrowseCourseList {...listProps} courses={[course]} totalElements={25} totalPages={3} />
    );

    expect(screen.getByRole("button", { name: "Go to page 1" })).toHaveAttribute("aria-current", "page");
    rerender(
      <BrowseCourseList
        {...listProps}
        courses={[course]}
        totalElements={25}
        totalPages={3}
        page={1}
        focusRequest={1}
      />
    );
    expect(document.getElementById("course-results-summary")).toHaveFocus();
    expect(document.getElementById("course-results-summary")).toHaveTextContent(
      "Showing courses 13 through 24 of 25 courses found"
    );
    expect(screen.getByRole("button", { name: "Go to page 2" })).toHaveAttribute("aria-current", "page");

    const sortSelect = screen.getByRole("combobox", { name: "Sort by:" });
    sortSelect.focus();
    rerender(
      <BrowseCourseList
        {...listProps}
        courses={[course]}
        totalElements={25}
        totalPages={3}
        page={1}
        focusRequest={1}
        isFetching
      />
    );
    rerender(
      <BrowseCourseList
        {...listProps}
        courses={[course]}
        totalElements={25}
        totalPages={3}
        page={1}
        focusRequest={1}
      />
    );
    expect(sortSelect).toHaveFocus();
  });

  it("traps keyboard focus in the mobile dialog, closes on Escape, and labels it", async () => {
    const onClose = vi.fn();
    render(
      <MobileFilterDrawer
        isOpen
        onClose={onClose}
        onApply={vi.fn()}
        categories={[]}
        selectedCategoryIds={[]}
        onCategoryChange={vi.fn()}
        selectedLevels={[]}
        onLevelChange={vi.fn()}
        minPrice=""
        maxPrice=""
        setMinPrice={vi.fn()}
        setMaxPrice={vi.fn()}
        setMinRating={vi.fn()}
        filterType="all"
        onFilterTypeChange={vi.fn()}
        onClearFilters={vi.fn()}
        showClearButton={false}
      />
    );

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    const close = await screen.findByRole("button", { name: "Close filters" });
    expect(close).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps mobile clear and apply as independent explicit actions", async () => {
    const onClearFilters = vi.fn();
    const onApply = vi.fn();
    render(
      <MobileFilterDrawer
        isOpen
        onClose={vi.fn()}
        onApply={onApply}
        categories={[]}
        selectedCategoryIds={[1]}
        onCategoryChange={vi.fn()}
        selectedLevels={[]}
        onLevelChange={vi.fn()}
        minPrice=""
        maxPrice=""
        setMinPrice={vi.fn()}
        setMaxPrice={vi.fn()}
        setMinRating={vi.fn()}
        filterType="all"
        onFilterTypeChange={vi.fn()}
        onClearFilters={onClearFilters}
        showClearButton
      />
    );

    expect(screen.queryByRole("button", { name: "Clear All Filters" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Apply Filters" }));
    expect(onApply).toHaveBeenCalledOnce();
  });

  it("renders only supplied applied chips with named removal controls", () => {
    render(
      <BrowseActiveFilters
        activeFiltersCount={2}
        filterType="all"
        selectedCategories={[]}
        onCategoryChange={vi.fn()}
        selectedLevels={[]}
        onLevelChange={vi.fn()}
        minPrice=""
        maxPrice=""
        onClearPrice={vi.fn()}
        minRating={4.5}
        onClearRating={vi.fn()}
        appliedKeyword="React"
        onClearSearch={vi.fn()}
      />
    );

    expect(screen.getByText('Search: "React"')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove minimum rating filter: 4.5 and up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove search keyword filter" })).toBeInTheDocument();
  });
});
