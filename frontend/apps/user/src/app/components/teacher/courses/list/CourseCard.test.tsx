import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CourseResponse } from "@edumind/shared-types";
import { CourseCard } from "./CourseCard";

const course = (status: CourseResponse["status"]): CourseResponse => ({
  id: 1,
  title: "Lifecycle course",
  status,
  price: 0,
  currency: "USD",
} as CourseResponse);

const callbacks = () => ({
  onView: vi.fn(),
  onEdit: vi.fn(),
  onArchive: vi.fn(),
  onPublish: vi.fn(),
});

describe("CourseCard lifecycle actions", () => {
  it("only offers View Details for an archived course", () => {
    const handlers = callbacks();
    render(<CourseCard course={course("ARCHIVED")} viewMode="list" {...handlers} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(screen.getByText("View Details")).toBeInTheDocument();
    expect(screen.queryByText("Edit Course")).not.toBeInTheDocument();
    expect(screen.queryByText("Publish")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();
  });

  it("offers Archive for a draft course", () => {
    const handlers = callbacks();
    render(<CourseCard course={course("DRAFT")} viewMode="list" {...handlers} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByText("Archive"));

    expect(handlers.onArchive).toHaveBeenCalledOnce();
  });
});
