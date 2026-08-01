import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./ScrollToTop";

const { mockShowSuccess } = vi.hoisted(() => ({
  mockShowSuccess: vi.fn(),
}));

vi.mock("@edumind/user-ui", () => ({
  useToast: () => ({
    success: mockShowSuccess,
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("route accessibility", () => {
  it("focuses the new page heading and updates the document title", async () => {
    const user = userEvent.setup();
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      <MemoryRouter initialEntries={["/first"]}>
        <ScrollToTop />
        <Link to="/second">Next page</Link>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/first" element={<h1>First</h1>} />
            <Route path="/second" element={<h1>Second</h1>} />
          </Routes>
        </main>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Next page" }));
    const heading = await screen.findByRole("heading", {
      name: "Second",
      level: 1,
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.title).toBe("Second | EduMind");
    focusSpy.mockRestore();
  });

  it("announces route notifications only after focusing the destination heading", async () => {
    mockShowSuccess.mockClear();
    const user = userEvent.setup();
    const events: string[] = [];
    mockShowSuccess.mockImplementation(() => events.push("notification"));
    const focusSpy = vi
      .spyOn(HTMLElement.prototype, "focus")
      .mockImplementation(function (this: HTMLElement) {
        if (this.textContent === "My Learning") events.push("heading");
      });

    render(
      <MemoryRouter initialEntries={["/course"]}>
        <ScrollToTop />
        <Link
          to="/learning"
          state={{
            notification: {
              variant: "success",
              message: "Successfully enrolled in course!",
            },
          }}
        >
          Enroll
        </Link>
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/course" element={<h1>Course details</h1>} />
            <Route path="/learning" element={<h1>My Learning</h1>} />
          </Routes>
        </main>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Enroll" }));
    await waitFor(() =>
      expect(mockShowSuccess).toHaveBeenCalledWith(
        "Successfully enrolled in course!",
      ),
    );
    expect(events).toEqual(["heading", "notification"]);
    focusSpy.mockRestore();
  });

});
