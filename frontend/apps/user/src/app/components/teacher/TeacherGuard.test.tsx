import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserRole } from "@edumind/shared-constants";
import { TeacherGuard } from "./TeacherGuard";

vi.mock("../../stores/auth.store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../stores/auth.store")>();
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

vi.mock("@edumind/user-ui", () => ({
  FullPageLoading: ({ message }: { message: string }) => <div>{message}</div>,
}));

import { useAuthStore, resetRoleSyncAttempts } from "../../stores/auth.store";

const mockAuthStore = vi.mocked(useAuthStore);

const baseState = () => ({
  user: { id: 1, roles: [UserRole.STUDENT] as string[] },
  isAuthenticated: true,
  isLoading: false,
  isRefreshingSession: false,
  sessionRefreshError: null as "SESSION_EXPIRED" | "TEMPORARY" | null,
  refreshSession: vi.fn(),
});

const renderGuard = () =>
  render(
    <MemoryRouter initialEntries={["/teacher/dashboard"]}>
      <Routes>
        <Route path="/teacher/dashboard" element={<TeacherGuard />}>
          <Route index element={<div>teacher-outlet</div>} />
        </Route>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/dashboard" element={<div>student-dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("TeacherGuard", () => {
  let state: ReturnType<typeof baseState>;

  beforeEach(() => {
    state = baseState();
    mockAuthStore.mockImplementation(() => state as unknown as ReturnType<typeof useAuthStore>);
    resetRoleSyncAttempts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows 'Verifying access…' and does not redirect for a stale-role direct bookmark", () => {
    state.refreshSession = vi.fn().mockReturnValue(new Promise<void>(() => undefined)); // never resolves

    renderGuard();

    expect(screen.getByText("Verifying access…")).toBeInTheDocument();
    expect(screen.queryByText("login-page")).not.toBeInTheDocument();
    expect(screen.queryByText("student-dashboard")).not.toBeInTheDocument();
  });

  it("calls refreshSession exactly once after the sync effect runs", async () => {
    state.refreshSession = vi.fn().mockResolvedValue(undefined);

    renderGuard();

    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));
  });

  it("does not fire a second refresh on rerender once the guard already attempted a sync", async () => {
    state.refreshSession = vi.fn().mockResolvedValue(undefined);

    const { rerender } = renderGuard();
    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={["/teacher/dashboard"]}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherGuard />}>
            <Route index element={<div>teacher-outlet</div>} />
          </Route>
          <Route path="/dashboard" element={<div>student-dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(state.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("renders the outlet once the sync grants the teacher role, without ever bouncing to another route", async () => {
    state.refreshSession = vi.fn().mockImplementation(async () => {
      state.user = { id: 1, roles: [UserRole.STUDENT, UserRole.TEACHER] };
    });

    const { rerender } = renderGuard();
    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={["/teacher/dashboard"]}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherGuard />}>
            <Route index element={<div>teacher-outlet</div>} />
          </Route>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/dashboard" element={<div>student-dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("teacher-outlet")).toBeInTheDocument();
    expect(screen.queryByText("login-page")).not.toBeInTheDocument();
    expect(screen.queryByText("student-dashboard")).not.toBeInTheDocument();
  });

  it("logs no React warning about state updates during render", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    state.refreshSession = vi.fn().mockResolvedValue(undefined);

    renderGuard();
    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("redirects to the student dashboard with TEACHER_ACCESS_UNAVAILABLE once refresh finishes but the role is still STUDENT", async () => {
    state.refreshSession = vi.fn().mockResolvedValue(undefined); // roles stay STUDENT-only

    const { rerender } = renderGuard();
    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={["/teacher/dashboard"]}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherGuard />}>
            <Route index element={<div>teacher-outlet</div>} />
          </Route>
          <Route path="/dashboard" element={<div>student-dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("student-dashboard")).toBeInTheDocument();
  });

  it("redirects to login when the refresh fails terminally (auth cleared; reason lives in the store, not route state)", async () => {
    state.refreshSession = vi.fn().mockImplementation(async () => {
      state.isAuthenticated = false;
      state.user = null as any;
      state.sessionRefreshError = "SESSION_EXPIRED";
    });

    const { rerender } = renderGuard();
    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={["/teacher/dashboard"]}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherGuard />}>
            <Route index element={<div>teacher-outlet</div>} />
          </Route>
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("login-page")).toBeInTheDocument();
  });

  it("redirects to the student dashboard (no loop) on a temporary refresh failure", async () => {
    state.refreshSession = vi.fn().mockImplementation(async () => {
      state.sessionRefreshError = "TEMPORARY";
    });

    const { rerender } = renderGuard();
    await waitFor(() => expect(state.refreshSession).toHaveBeenCalledTimes(1));

    rerender(
      <MemoryRouter initialEntries={["/teacher/dashboard"]}>
        <Routes>
          <Route path="/teacher/dashboard" element={<TeacherGuard />}>
            <Route index element={<div>teacher-outlet</div>} />
          </Route>
          <Route path="/dashboard" element={<div>student-dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("student-dashboard")).toBeInTheDocument();
    // Still just one refresh call — the redirect never re-triggers the guard's sync effect.
    expect(state.refreshSession).toHaveBeenCalledTimes(1);
  });
});
