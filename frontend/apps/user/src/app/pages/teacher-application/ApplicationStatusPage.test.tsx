import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTeacherApplicationStatus } from "../../hooks";
import { ApplicationStatusPage } from "./ApplicationStatusPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks", () => ({
  useTeacherApplicationStatus: vi.fn(),
}));

const mockStatus = vi.mocked(useTeacherApplicationStatus);

const baseApplication = {
  status: "PENDING",
  firstName: "Jane",
  lastName: "Doe",
  phone: "0123456789",
  subject: "Math",
  createdAt: "2026-01-01T00:00:00Z",
  documents: [],
};

describe("ApplicationStatusPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
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

  it("shows Go to Teacher Dashboard for APPROVED and no Apply Again button", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { ...baseApplication, status: "APPROVED" },
    } as unknown as ReturnType<typeof useTeacherApplicationStatus>);

    render(<ApplicationStatusPage />);

    expect(
      screen.getByRole("button", { name: "Go to Teacher Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply Again" }),
    ).not.toBeInTheDocument();
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
