import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./ScrollToTop";

describe("route accessibility", () => {
  it("focuses the new page main landmark and updates the title from its heading", async () => {
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
    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.title).toBe("Second | EduMind");
    focusSpy.mockRestore();
  });
});
