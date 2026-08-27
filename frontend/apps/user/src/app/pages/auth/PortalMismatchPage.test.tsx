import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockStartSwitchingAccount = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../stores/auth.store", () => ({
  useAuthStore: {
    getState: () => ({ startSwitchingAccount: mockStartSwitchingAccount }),
  },
}));

// ADMIN_PORTAL_URL is mutated per-test via vi.mock factory below (default: set).
vi.mock("@edumind/shared-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@edumind/shared-utils")>();
  return {
    ...actual,
    ADMIN_PORTAL_URL: "https://admin.edumind.nguyenloc.dev",
  };
});

import { PortalMismatchPage } from "./PortalMismatchPage";
import { USER_ROUTES } from "@edumind/shared-utils";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/courses/42"]}>
      <PortalMismatchPage />
    </MemoryRouter>,
  );
}

describe("PortalMismatchPage", () => {
  beforeEach(() => {
    mockStartSwitchingAccount.mockClear();
    mockNavigate.mockClear();
  });

  it("renders as an alert", () => {
    renderPage();

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("offers a way to log in with a different account", async () => {
    const user = userEvent.setup();
    renderPage();

    const switchButton = screen.getByRole("button", { name: /log in with a different account/i });
    await user.click(switchButton);

    expect(mockStartSwitchingAccount).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      USER_ROUTES.LOGIN,
      expect.objectContaining({ state: expect.objectContaining({ from: expect.anything() }) }),
    );
  });

  it("offers a link to the admin portal, sourced from configuration (not hardcoded)", () => {
    renderPage();

    const link = screen.getByRole("link", { name: /go to the admin portal/i });
    expect(link).toHaveAttribute("href", "https://admin.edumind.nguyenloc.dev");
  });

  it("renders no logout button", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
  });
});
