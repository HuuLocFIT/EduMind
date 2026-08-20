import { useState } from "react";
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

  it("keeps waiting through destination rerenders and focuses its delayed heading", async () => {
    const user = userEvent.setup();

    function TestApp() {
      const [rerenders, setRerenders] = useState(0);
      const [ready, setReady] = useState(false);

      return (
        <>
          <ScrollToTop />
          <Link to="/learning">Start Learning</Link>
          <button onClick={() => setRerenders((value) => value + 1)}>
            Rerender app {rerenders}
          </button>
          <button onClick={() => setReady(true)}>Finish loading</button>
          <main id="main-content" tabIndex={-1}>
            <Routes>
              <Route path="/checkout/success" element={<h1 tabIndex={-1}>Payment Successful!</h1>} />
              <Route
                path="/learning"
                element={ready ? <h1>My Learning</h1> : <div aria-hidden="true">Loading skeleton</div>}
              />
            </Routes>
          </main>
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={["/checkout/success"]}>
        <TestApp />
      </MemoryRouter>,
    );

    screen.getByRole("heading", { name: "Payment Successful!" }).focus();
    await user.click(screen.getByRole("link", { name: "Start Learning" }));
    await user.click(screen.getByRole("button", { name: /Rerender app/ }));
    await user.click(screen.getByRole("button", { name: "Finish loading" }));

    const heading = await screen.findByRole("heading", { name: "My Learning" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.title).toBe("My Learning | EduMind");
  });

  // A query-param change is how in-page state (the course player's `?lesson=`,
  // browse filters, pagination) mirrors itself into the URL — it is not a
  // navigation. Treating it as one steals focus from whatever the page just
  // focused, blanks the page's own <title>, and arms the 3s `main.focus()`
  // fallback against a page that is not loading.
  it("does not treat a query-param-only change as a navigation", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <MemoryRouter initialEntries={["/learn/course-a?lesson=1"]}>
        <ScrollToTop />
        <main id="main-content" tabIndex={-1}>
          <Routes>
            <Route
              path="/learn/:slug"
              element={
                <>
                  <h1>Course A</h1>
                  <Link to="/learn/course-a?lesson=2" replace>
                    Next lesson
                  </Link>
                  <h2 tabIndex={-1}>Lesson heading</h2>
                </>
              }
            />
          </Routes>
        </main>
      </MemoryRouter>,
    );

    document.title = "Lesson one | EduMind";
    await user.click(screen.getByRole("link", { name: "Next lesson" }));

    // The page's own focus target, standing in for the course player's
    // post-navigation lesson-heading focus.
    const lessonHeading = screen.getByRole("heading", { level: 2 });
    lessonHeading.focus();

    await vi.advanceTimersByTimeAsync(3500);

    expect(lessonHeading).toHaveFocus();
    expect(document.title).toBe("Lesson one | EduMind");
    vi.useRealTimers();
  });
});
