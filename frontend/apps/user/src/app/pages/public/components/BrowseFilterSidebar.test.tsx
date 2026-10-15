import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowseFilterSidebar } from "./BrowseFilterSidebar";

vi.mock("@edumind/user-ui", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("../../../components/course-module", () => ({
  CategoryFilter: () => null,
}));

const renderSidebar = (overrides: Partial<React.ComponentProps<typeof BrowseFilterSidebar>> = {}) => {
  const props: React.ComponentProps<typeof BrowseFilterSidebar> = {
    categories: [],
    selectedCategoryIds: [],
    onCategoryChange: vi.fn(),
    selectedLevels: [],
    onLevelChange: vi.fn(),
    minPrice: "",
    maxPrice: "",
    setMinPrice: vi.fn(),
    setMaxPrice: vi.fn(),
    setMinRating: vi.fn(),
    filterType: "all",
    onClearFilters: vi.fn(),
    showClearButton: false,
    ...overrides,
  };
  const view = render(<BrowseFilterSidebar {...props} />);
  return { ...view, props };
};

describe("BrowseFilterSidebar price filter", () => {
  it("does not search while typing, and applies on Enter", async () => {
    const { props } = renderSidebar();
    const maxInput = screen.getByLabelText("Max ($)");

    await userEvent.type(maxInput, "150");
    expect(props.setMaxPrice).not.toHaveBeenCalled();

    await userEvent.keyboard("{Enter}");
    expect(props.setMaxPrice).toHaveBeenCalledOnce();
    expect(props.setMaxPrice).toHaveBeenCalledWith("150");
    expect(props.setMinPrice).not.toHaveBeenCalled();
  });

  it("enables Apply price only when the draft differs from the applied price", async () => {
    const { props } = renderSidebar();
    const apply = screen.getByRole("button", { name: "Apply price" });
    expect(apply).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Min ($)"), "20");
    expect(apply).toBeEnabled();

    await userEvent.click(apply);
    expect(props.setMinPrice).toHaveBeenCalledWith("20");
  });

  it("resets the draft when the applied price changes from outside", async () => {
    const { props, rerender } = renderSidebar({ minPrice: "20" });
    const minInput = screen.getByLabelText("Min ($)");

    await userEvent.clear(minInput);
    await userEvent.type(minInput, "35");
    expect(minInput).toHaveValue(35);

    // e.g. "Clear all filters" or browser Back
    rerender(<BrowseFilterSidebar {...props} minPrice="" />);
    expect(minInput).toHaveValue(null);
    expect(screen.getByRole("button", { name: "Apply price" })).toBeDisabled();
  });

  it("passes edits straight through when the parent buffers them (mobile drawer)", async () => {
    const { props } = renderSidebar({ applyPriceImmediately: true });

    await userEvent.type(screen.getByLabelText("Max ($)"), "9");

    expect(props.setMaxPrice).toHaveBeenCalledWith("9");
    expect(screen.queryByRole("button", { name: "Apply price" })).not.toBeInTheDocument();
  });
});
