import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthBootBoundary } from "./AuthBootBoundary";

const mockBootstrapAuthSession = vi.fn();

vi.mock("../stores/auth.store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../stores/auth.store")>();
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

import { useAuthStore } from "../stores/auth.store";

const mockAuthStore = vi.mocked(useAuthStore);

const baseState = () => ({
  authBootStatus: "idle" as "idle" | "checking" | "ready" | "retry",
  sessionRefreshError: null as "SESSION_EXPIRED" | "TEMPORARY" | "PORTAL_MISMATCH" | null,
});

describe("AuthBootBoundary", () => {
  let state: ReturnType<typeof baseState>;

  beforeEach(() => {
    state = baseState();
    mockAuthStore.mockImplementation((selector?: any) =>
      selector ? selector(state) : state,
    );
    mockAuthStore.getState = vi.fn(() => ({
      ...state,
      bootstrapAuthSession: mockBootstrapAuthSession,
    })) as any;
    mockBootstrapAuthSession.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers the boot probe once on mount", () => {
    render(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it("renders route content immediately while the boot probe is still checking (does not block LCP)", () => {
    state.authBootStatus = "checking";

    render(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.getByText("route-content")).toBeInTheDocument();
  });

  it("renders route content once boot is ready with no mismatch", () => {
    state.authBootStatus = "ready";

    render(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.getByText("route-content")).toBeInTheDocument();
  });

  it("replaces route content with a retry screen on a temporary boot failure", async () => {
    state.authBootStatus = "retry";
    const user = userEvent.setup();

    render(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.queryByText("route-content")).not.toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /retry/i });

    await user.click(retryButton);
    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(2); // once on mount, once on click
  });

  it("replaces route content with a portal-mismatch notice, keeping the URL unchanged (no Navigate)", () => {
    state.authBootStatus = "ready";
    state.sessionRefreshError = "PORTAL_MISMATCH";

    render(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.queryByText("route-content")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
