import { useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthLayout } from "./AuthLayout";
import { MainLayout } from "./MainLayout";

const mockAuthState = vi.hoisted(() => ({
  state: {
    isAuthenticated: false,
    user: null as null | {
      firstName: string;
      lastName: string;
      email: string;
      profilePictureUrl?: string;
      roles: string[];
    },
    logout: vi.fn(),
  },
}));
const mockAuthUi = vi.hoisted(() => ({ ready: true }));

vi.mock("../stores/auth.store", () => {
  return {
    useAuthStore: (selector?: (value: typeof mockAuthState.state) => unknown) =>
      selector ? selector(mockAuthState.state) : mockAuthState.state,
  };
});

vi.mock("../hooks", () => ({
  useTeacherApplication: () => ({ data: null }),
  useTeacherApplicationStatus: () => ({
    application: null,
    status: null,
    hasApplication: false,
    canApply: true,
    isRejected: false,
  }),
  useAuthUiReady: () => mockAuthUi.ready,
  useTeacherRoleSync: () => ({
    hasTeacherRole: false,
    isRefreshingSession: false,
    sessionRefreshError: null,
    needsSync: false,
  }),
}));

vi.mock("../components/payment-module", () => ({
  CartIcon: () => <button type="button">Cart</button>,
  CartDrawer: () => null,
}));

vi.mock("../components/Seo/SeoMetaTags", () => ({
  SeoMetaTags: ({ title }: { title: string }) => <span data-testid="page-title">{title}</span>,
}));

describe("layout accessibility contracts", () => {
  beforeEach(() => {
    mockAuthState.state.isAuthenticated = false;
    mockAuthState.state.user = null;
    mockAuthState.state.logout.mockReset();
    mockAuthUi.ready = true;
  });

  it("renders neutral navigation controls during prerender", () => {
    mockAuthUi.ready = false;
    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <Routes>
          <Route path="/courses" element={<MainLayout />}>
            <Route index element={<h1>Courses</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId("auth-ui-skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign Up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User menu" })).not.toBeInTheDocument();
  });

  const DeferredHeading = () => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      setReady(true);
    }, []);

    return ready ? <h1>Create Account</h1> : <p>Loading…</p>;
  };

  it.each([
    ["/login", "Sign In"],
    ["/signup", "Create Account"],
    ["/forgot-password", "Forgot Password"],
    ["/reset-password?token=valid", "Reset Password"],
    ["/resend-verification", "Resend Verification Email"],
  ])("provides the route-specific auth title for %s", (entry, title) => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="*" element={<h1>{title}</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("page-title")).toHaveTextContent(title);
  });

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
    const heading = screen.getByRole("heading", { name: "Courses", level: 1 });
    await user.keyboard("{Enter}");
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute("tabindex", "-1");
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

  it("keeps authenticated account menus within the viewport and keyboard operable", async () => {
    mockAuthState.state.isAuthenticated = true;
    mockAuthState.state.user = {
      firstName: "Test",
      lastName: "Student",
      email: "student@example.com",
      roles: [],
    };
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/courses"]}>
        <Routes>
          <Route path="/courses" element={<MainLayout />}>
            <Route index element={<h1>Courses</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", { name: "Open navigation menu" }),
    );
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" }),
    ).toHaveClass(
      "max-h-[calc(100dvh-4rem)]",
      "overflow-y-auto",
      "overscroll-contain",
    );

    const trigger = screen.getByRole("button", { name: "User menu" });
    await user.click(trigger);
    const accountMenu = screen.getByRole("menu", {
      name: "User account options",
    });
    expect(accountMenu).toHaveClass(
      "max-h-[calc(100dvh-5rem)]",
      "overflow-y-auto",
      "overscroll-contain",
    );

    const dashboard = screen.getByRole("menuitem", { name: "Dashboard" });
    const learning = screen.getByRole("menuitem", { name: "My Learning" });
    const logout = screen.getByRole("menuitem", { name: "Logout" });
    await waitFor(() => expect(dashboard).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(learning).toHaveFocus();
    await user.keyboard("{End}");
    expect(logout).toHaveFocus();
    await user.keyboard("{Home}");
    expect(dashboard).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(accountMenu).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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
    const heading = screen.getByRole("heading", { name: "Sign in", level: 1 });
    await waitFor(() => expect(heading).toHaveFocus());
    heading.blur();
    await user.tab();
    expect(skipLink).toHaveFocus();
    expect(skipLink).toHaveAttribute(
      "href",
      "/login?redirect=/checkout#main-content",
    );
    await user.keyboard("{Enter}");
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(window.location.hash).toBe("");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("link", { name: "EduMind home" })).toHaveAttribute("href", "/");
    expect(screen.getByTestId("page-title")).toHaveTextContent("Sign In");
  });

  it("focuses the new page heading when the auth route changes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <>
                  <h1>Sign In</h1>
                  <Link to="/signup">Create account</Link>
                </>
              }
            />
            <Route path="/signup" element={<DeferredHeading />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Create account" }));
    const heading = await screen.findByRole("heading", {
      name: "Create Account",
      level: 1,
    });

    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAttribute("tabindex", "-1");
  });

  it("focuses the heading when a directly visited lazy auth route finishes rendering", async () => {
    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/signup" element={<DeferredHeading />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const heading = await screen.findByRole("heading", {
      name: "Create Account",
      level: 1,
    });
    await waitFor(() => expect(heading).toHaveFocus());
  });
});
