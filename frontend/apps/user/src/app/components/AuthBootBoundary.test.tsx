import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthBootBoundary } from "./AuthBootBoundary";

const mockBootstrapAuthSession = vi.fn();
const mockStartSwitchingAccount = vi.fn();

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
  isSwitchingAccount: false,
});

function renderBoundary(children: React.ReactNode) {
  return render(<MemoryRouter>{children}</MemoryRouter>);
}

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
      startSwitchingAccount: mockStartSwitchingAccount,
    })) as any;
    mockBootstrapAuthSession.mockClear();
    mockStartSwitchingAccount.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers the boot probe once on mount", () => {
    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it("renders route content immediately while the boot probe is still checking (does not block LCP)", () => {
    state.authBootStatus = "checking";

    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.getByText("route-content")).toBeInTheDocument();
  });

  it("renders route content once boot is ready with no mismatch", () => {
    state.authBootStatus = "ready";

    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.getByText("route-content")).toBeInTheDocument();
  });

  it("replaces route content with a retry screen on a temporary boot failure", async () => {
    state.authBootStatus = "retry";
    const user = userEvent.setup();

    renderBoundary(
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

    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.queryByText("route-content")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  describe("switchingAccount", () => {
    it("offers a way to log in with a different account from the mismatch notice", async () => {
      state.authBootStatus = "ready";
      state.sessionRefreshError = "PORTAL_MISMATCH";
      const user = userEvent.setup();

      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      const switchButton = screen.getByRole("button", { name: /log in with a different account/i });
      await user.click(switchButton);

      expect(mockStartSwitchingAccount).toHaveBeenCalledTimes(1);
    });

    it("renders route content (the login route) once isSwitchingAccount is true, even though sessionRefreshError is still PORTAL_MISMATCH", () => {
      state.authBootStatus = "ready";
      state.sessionRefreshError = "PORTAL_MISMATCH";
      state.isSwitchingAccount = true;

      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      expect(screen.getByText("route-content")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
