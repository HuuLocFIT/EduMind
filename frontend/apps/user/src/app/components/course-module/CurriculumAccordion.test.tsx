import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CurriculumAccordion } from "./CurriculumAccordion";

vi.mock("@edumind/user-ui", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

const sections = [
  {
    id: 1,
    title: "Getting started",
    lessonCount: 2,
    totalDurationMinutes: 12,
    lessons: [
      { id: 11, title: "Welcome", contentType: "VIDEO", videoDuration: 90, isPreview: true },
      { id: 12, title: "Setup", contentType: "ARTICLE", videoDuration: 0, isPreview: false },
    ],
  },
  { id: 2, title: "Advanced topics", lessonCount: 0, lessons: [] },
] as any;

describe("CurriculumAccordion accessibility", () => {
  it("keeps aria-expanded synchronized with its controlled panel", async () => {
    const user = userEvent.setup();
    render(<CurriculumAccordion sections={sections} isEnrolled={false} />);

    const sectionButton = screen.getByRole("button", { name: /getting started/i });
    expect(sectionButton).toHaveAttribute("aria-expanded", "true");
    const panelId = sectionButton.getAttribute("aria-controls")!;
    expect(document.getElementById(panelId)).toBeInTheDocument();

    await user.click(sectionButton);
    expect(sectionButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(panelId)).not.toBeInTheDocument();
  });

  it("exposes preview and locked lesson states as text", () => {
    render(<CurriculumAccordion sections={sections} isEnrolled={false} />);
    const panel = screen.getByRole("region", { name: "Getting started" });
    expect(within(panel).getByText("Preview")).toBeInTheDocument();
    expect(within(panel).getByText("Locked")).toBeInTheDocument();
  });

  it("updates the expand-all button name and state", async () => {
    const user = userEvent.setup();
    render(<CurriculumAccordion sections={sections} isEnrolled />);
    const expandAll = screen.getByRole("button", { name: "Expand all sections" });

    expect(expandAll).toHaveAttribute("aria-expanded", "false");
    await user.click(expandAll);
    expect(screen.getByRole("button", { name: "Collapse all sections" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});
