import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AuthBootBoundary, __resetForegroundReconcileThrottleForTests } from "./AuthBootBoundary";

const mockBootstrapAuthSession = vi.fn();
const mockStartSwitchingAccount = vi.fn();
const mockRefreshSession = vi.fn();

function setDocumentVisibility(visibility: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
}

function fireVisibilityChange() {
  fireEvent(document, new Event("visibilitychange"));
}

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
  isRefreshingSession: false,
  // Read by hasUnconfirmedSession — a TEMPORARY failure only blocks rendering when there is a
  // snapshot it failed to confirm. Default: a guest, with nothing at stake.
  isAuthenticated: false,
  user: null as { id: number } | null,
});

/** A local snapshot waiting to be confirmed — what makes an unconfirmed probe unsafe. */
function withSnapshot(state: ReturnType<typeof baseState>) {
  state.isAuthenticated = true;
  state.user = { id: 1 };
}

function renderBoundary(children: React.ReactNode) {
  return render(<MemoryRouter>{children}</MemoryRouter>);
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-path">{location.pathname}</span>;
}

function renderBoundaryAt(path: string, children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      {children}
    </MemoryRouter>,
  );
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
      refreshSession: mockRefreshSession,
    })) as any;
    mockBootstrapAuthSession.mockClear();
    mockStartSwitchingAccount.mockClear();
    mockRefreshSession.mockClear();
    setDocumentVisibility("visible");
    __resetForegroundReconcileThrottleForTests();
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
    state.sessionRefreshError = "TEMPORARY";
    withSnapshot(state);
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

  // The regression this whole boundary exists for: a foreground reconcile that fails for an
  // unconfirmed reason leaves a snapshot that is no longer evidence of anything. The overlay
  // below only covers the in-flight window, so before this the settled failure fell straight
  // through to `children` and the unconfirmed identity kept rendering as authenticated —
  // invariant #4, and the business requests it could still issue, invariant #7.
  it("keeps route content blocked after a foreground reconcile fails temporarily (request settled)", async () => {
    state.authBootStatus = "ready";
    state.sessionRefreshError = "TEMPORARY";
    state.isRefreshingSession = false; // the probe has finished — the overlay is gone
    withSnapshot(state);
    const user = userEvent.setup();

    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.queryByText("route-content")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockBootstrapAuthSession).toHaveBeenCalledTimes(2);
  });

  it("renders route content again once a retried probe confirms the session", () => {
    state.authBootStatus = "ready";
    state.sessionRefreshError = null; // cleared by bootstrapAuthSession's success path
    withSnapshot(state);

    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.getByText("route-content")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("leaves public content alone when a guest's probe fails temporarily (no snapshot at stake)", () => {
    state.authBootStatus = "retry";
    state.sessionRefreshError = "TEMPORARY";
    // No snapshot: nothing can be rendered as an unconfirmed identity, so an API hiccup must
    // not take the public site (and prerendering/LCP with it) down to a retry screen.

    renderBoundary(
      <AuthBootBoundary>
        <div>route-content</div>
      </AuthBootBoundary>,
    );

    expect(screen.getByText("route-content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
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

  it("shows the mismatch notice on a public route without navigating away from it", () => {
    // ProtectedRoute never runs on a public route like /courses, so this boundary is the
    // only place a mismatch can be caught there. If it navigated instead of overlaying, a
    // deep-linked public page would silently redirect a legitimate visitor of the OTHER
    // portal's identity.
    state.authBootStatus = "ready";
    state.sessionRefreshError = "PORTAL_MISMATCH";

    renderBoundaryAt(
      "/courses",
      <AuthBootBoundary>
        <div>course-catalog</div>
      </AuthBootBoundary>,
    );

    expect(screen.queryByText("course-catalog")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("current-path")).toHaveTextContent("/courses");
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

  describe("foreground reconcile", () => {
    beforeEach(() => {
      state.authBootStatus = "ready";
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("probes on visibilitychange while the tab becomes visible", () => {
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });

    it("does not probe while the tab is hidden", () => {
      setDocumentVisibility("hidden");
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).not.toHaveBeenCalled();
    });

    it("throttles repeated probes within the throttle window, and probes again once it elapses", () => {
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(59_000);
      fireVisibilityChange();
      expect(mockRefreshSession).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(2_000);
      fireVisibilityChange();
      expect(mockRefreshSession).toHaveBeenCalledTimes(2);
    });

    it("runs while unauthenticated too (a cookie may have been set by another tab/portal)", () => {
      // baseState carries no isAuthenticated field at all — the trigger must not depend on it.
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    });

    it("does not probe while boot is not ready yet", () => {
      state.authBootStatus = "checking";
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).not.toHaveBeenCalled();
    });

    it("does not probe once portal-mismatched", () => {
      state.sessionRefreshError = "PORTAL_MISMATCH";
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).not.toHaveBeenCalled();
    });

    it("does not probe while switching accounts", () => {
      state.sessionRefreshError = "PORTAL_MISMATCH";
      state.isSwitchingAccount = true;
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).not.toHaveBeenCalled();
    });

    it("does not probe again while a probe is already in flight", () => {
      state.isRefreshingSession = true;
      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      fireVisibilityChange();

      expect(mockRefreshSession).not.toHaveBeenCalled();
    });
  });

  describe("reconciling overlay", () => {
    it("renders a blocking overlay while a foreground reconcile is in flight, keeping route content mounted underneath", () => {
      state.authBootStatus = "ready";
      state.isRefreshingSession = true;

      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      expect(screen.getByText("route-content")).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("covers the full viewport and captures pointer events, so no auth-sensitive control underneath is reachable by a click", () => {
      // jsdom does not perform real hit-testing, so a simulated click on the button below
      // would still fire even with the overlay present — that isn't evidence either way.
      // What we can assert, and what real-browser blocking actually depends on, is that the
      // overlay is a fixed, full-viewport, pointer-capturing layer above everything else
      // (invariant #7: no business request may fire on an unconfirmed identity).
      state.authBootStatus = "ready";
      state.isRefreshingSession = true;

      renderBoundary(
        <AuthBootBoundary>
          <button type="button">Checkout</button>
        </AuthBootBoundary>,
      );

      const overlay = screen.getByRole("status");
      expect(overlay.className).toMatch(/\binset-0\b/);
      expect(overlay.className).toMatch(/\bz-50\b/);
      expect(overlay).toHaveStyle({ pointerEvents: "auto" });
    });

    it("does not render the overlay when no reconcile is in flight", () => {
      state.authBootStatus = "ready";
      state.isRefreshingSession = false;

      renderBoundary(
        <AuthBootBoundary>
          <div>route-content</div>
        </AuthBootBoundary>,
      );

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
