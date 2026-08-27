import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("../stores/auth.store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../stores/auth.store")>();
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

vi.mock("@edumind/user-ui", () => ({
  FullPageLoading: ({ message }: { message: string }) => <div>{message}</div>,
}));

import { useAuthStore } from "../stores/auth.store";

const mockAuthStore = vi.mocked(useAuthStore);

const baseState = () => ({
  isAuthenticated: false,
  isLoading: false,
  authBootStatus: "ready" as "idle" | "checking" | "ready" | "retry",
});

const renderRoute = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute />}>
          <Route index element={<div>protected-outlet</div>} />
        </Route>
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProtectedRoute", () => {
  let state: ReturnType<typeof baseState>;

  beforeEach(() => {
    state = baseState();
    mockAuthStore.mockImplementation(() => state as unknown as ReturnType<typeof useAuthStore>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the outlet once authenticated, regardless of boot status", () => {
    state.isAuthenticated = true;
    state.authBootStatus = "checking";

    renderRoute();

    expect(screen.getByText("protected-outlet")).toBeInTheDocument();
  });

  it("redirects to login once boot is ready and no session was found", () => {
    state.isAuthenticated = false;
    state.authBootStatus = "ready";

    renderRoute();

    expect(screen.getByText("login-page")).toBeInTheDocument();
  });

  it("waits for the boot probe instead of redirecting when the local snapshot says unauthenticated", () => {
    // A cleared-by-mismatch snapshot on reload: local state says unauthenticated, but the
    // boot probe hasn't run yet and the shared cookie might still resolve to a valid session.
    state.isAuthenticated = false;
    state.authBootStatus = "checking";

    renderRoute();

    expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
    expect(screen.queryByText("login-page")).not.toBeInTheDocument();
  });

  it("shows loading while isLoading is true", () => {
    state.isLoading = true;

    renderRoute();

    expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
  });
});
