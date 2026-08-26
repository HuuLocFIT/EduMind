import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTeacherApplicationStatus, useTeacherRoleSync } from "../../hooks";
import { useAuthStore } from "../../stores/auth.store";
import { ApplicationStatusPage } from "./ApplicationStatusPage";

const mockNavigate = vi.fn();
const mockRefreshSession = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks", () => ({
  useTeacherApplicationStatus: vi.fn(),
  useTeacherRoleSync: vi.fn(),
}));

vi.mock("../../stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

const mockStatus = vi.mocked(useTeacherApplicationStatus);
const mockRoleSync = vi.mocked(useTeacherRoleSync);
const mockUseAuthStore = vi.mocked(useAuthStore);

const baseApplication = {
  id: 1,
  status: "PENDING",
  firstName: "Jane",
  lastName: "Doe",
  phone: "0123456789",
  subject: "Math",
  createdAt: "2026-01-01T00:00:00Z",
  documents: [],
};

const baseRoleSync = {
  hasTeacherRole: false,
  isRefreshingSession: false,
  sessionRefreshError: null as "SESSION_EXPIRED" | "TEMPORARY" | null,
  needsSync: false,
};

describe("ApplicationStatusPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockRefreshSession.mockClear();
    mockRoleSync.mockReturnValue(
      baseRoleSync as unknown as ReturnType<typeof useTeacherRoleSync>,
    );
    mockUseAuthStore.mockImplementation(
      ((selector: any) => selector({ refreshSession: mockRefreshSession })) as any,
    );
  });

  it("shows Apply Again for REJECTED and navigates to the form on click, and shows the reason", async () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: {
        ...baseApplication,
        status: "REJECTED",
        rejectionReason: "Missing certificate",
      },
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);

    render(<ApplicationStatusPage />);

    expect(screen.getByText("Missing certificate")).toBeInTheDocument();

    const applyAgain = screen.getByRole("button", { name: "Apply Again" });
    await userEvent.click(applyAgain);

    expect(mockNavigate).toHaveBeenCalledWith("/teacher/application");
  });

  it("shows Go to Teacher Dashboard for APPROVED with a synced teacher role, and no Apply Again button", async () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "APPROVED" },
      status: "APPROVED",
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);
    mockRoleSync.mockReturnValue({
      ...baseRoleSync,
      hasTeacherRole: true,
    } as unknown as ReturnType<typeof useTeacherRoleSync>);

    render(<ApplicationStatusPage />);

    const dashboardButton = screen.getByRole("button", { name: "Go to Teacher Dashboard" });
    expect(dashboardButton).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply Again" }),
    ).not.toBeInTheDocument();

    await userEvent.click(dashboardButton);
    expect(mockNavigate).toHaveBeenCalledWith("/teacher/dashboard");
  });

  it("disables the button while the role sync is in progress", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "APPROVED" },
      status: "APPROVED",
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);
    mockRoleSync.mockReturnValue({
      ...baseRoleSync,
      isRefreshingSession: true,
    } as unknown as ReturnType<typeof useTeacherRoleSync>);

    render(<ApplicationStatusPage />);

    expect(
      screen.getByRole("button", { name: /preparing your teacher access/i }),
    ).toBeDisabled();
  });

  it("shows a Retry CTA on temporary refresh failure and retries via refreshSession (bypassing the attempt flag)", async () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "APPROVED" },
      status: "APPROVED",
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);
    mockRoleSync.mockReturnValue({
      ...baseRoleSync,
      sessionRefreshError: "TEMPORARY",
    } as unknown as ReturnType<typeof useTeacherRoleSync>);

    render(<ApplicationStatusPage />);

    expect(screen.getByText(/couldn't connect/i)).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: "Retry" });
    await userEvent.click(retryButton);

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("shows no CTA at all when the refresh failed terminally (auth already cleared, ProtectedRoute redirects)", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "APPROVED" },
      status: "APPROVED",
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);
    mockRoleSync.mockReturnValue({
      ...baseRoleSync,
      sessionRefreshError: "SESSION_EXPIRED",
    } as unknown as ReturnType<typeof useTeacherRoleSync>);

    render(<ApplicationStatusPage />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn't connect/i)).not.toBeInTheDocument();
  });

  it("shows a not-yet-available message when refresh finished but role is still STUDENT, with no re-login CTA", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "APPROVED" },
      status: "APPROVED",
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);
    mockRoleSync.mockReturnValue(
      baseRoleSync as unknown as ReturnType<typeof useTeacherRoleSync>,
    );

    render(<ApplicationStatusPage />);

    const button = screen.getByRole("button", { name: "Teacher access is not available yet" });
    expect(button).toBeDisabled();
    expect(screen.queryByText(/sign in again/i)).not.toBeInTheDocument();
  });

  it("shows a review notice for PENDING and no resubmission button", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "PENDING" },
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);

    render(<ApplicationStatusPage />);

    expect(
      screen.getByText(/notify you via email once your application/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply Again" }),
    ).not.toBeInTheDocument();
  });
});
