import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthLayout } from "./AuthLayout";
import { MainLayout } from "./MainLayout";

vi.mock("../stores/auth.store", () => {
  const state = {
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  };
  return {
    useAuthStore: (selector?: (value: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock("../hooks", () => ({
  useTeacherApplication: () => ({ data: null }),
}));

vi.mock("../components/payment-module", () => ({
  CartIcon: () => <button type="button">Cart</button>,
  CartDrawer: () => null,
}));

vi.mock("../components/Seo/SeoMetaTags", () => ({
  SeoMetaTags: () => null,
}));

describe("layout accessibility contracts", () => {
  it("provides one main landmark and a keyboard-operable skip link in MainLayout", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/courses?level=beginner"]}>
        <Routes>
          <Route path="/courses" element={<MainLayout />}>
            <Route index element={<h1>Courses</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute(
      "href",
      "/courses?level=beginner#main-content",
    );
    await user.tab();
    expect(skipLink).toHaveFocus();
    const main = screen.getByRole("main");
    await user.keyboard("{Enter}");
    expect(main).toHaveFocus();
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveClass("scroll-mt-16");
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    expect(window.location.hash).toBe("");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo", { name: "Site footer" })).toBeInTheDocument();
  });

  it("provides a skip target and single main landmark in AuthLayout", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/login?redirect=/checkout"]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<h1>Sign in</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    await user.tab();
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute(
      "href",
      "/login?redirect=/checkout#main-content",
    );
    await user.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();
    expect(window.location.hash).toBe("");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });
});
