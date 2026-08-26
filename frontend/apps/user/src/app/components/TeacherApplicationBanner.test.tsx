import { render, screen } from "@testing-library/react";
import { UserRole } from "@edumind/shared-constants";
import { useAuthStore } from "../stores/auth.store";
import { useTeacherApplication } from "../hooks/useTeacherApplication";
import { TeacherApplicationBanner } from "./TeacherApplicationBanner";

vi.mock("../stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../hooks/useTeacherApplication", () => ({
  useTeacherApplication: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

const mockAuthStore = vi.mocked(useAuthStore);
const mockUseTeacherApplication = vi.mocked(useTeacherApplication);

describe("TeacherApplicationBanner", () => {
  beforeEach(() => {
    mockUseTeacherApplication.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useTeacherApplication>);
  });

  it.each([UserRole.TEACHER, UserRole.TEACHER_TRIAL])(
    "stays hidden for %s users who also retain the student role",
    (teacherRole) => {
      mockAuthStore.mockReturnValue({
        user: { id: 1, roles: [UserRole.STUDENT, teacherRole] },
      } as ReturnType<typeof useAuthStore>);

      render(<TeacherApplicationBanner />);

      expect(screen.queryByText("Become a Teacher")).not.toBeInTheDocument();
    },
  );

  it("still offers the application to a student without an application", () => {
    mockAuthStore.mockReturnValue({
      user: { id: 1, roles: [UserRole.STUDENT] },
    } as ReturnType<typeof useAuthStore>);

    render(<TeacherApplicationBanner />);

    expect(screen.getAllByText("Become a Teacher").length).toBeGreaterThan(0);
  });

  it("does not offer an application when the status query fails", () => {
    mockAuthStore.mockReturnValue({
      user: { id: 1, roles: [UserRole.STUDENT] },
    } as ReturnType<typeof useAuthStore>);
    mockUseTeacherApplication.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useTeacherApplication>);

    render(<TeacherApplicationBanner />);

    expect(screen.queryByText("Become a Teacher")).not.toBeInTheDocument();
  });

  describe("status-specific CTA", () => {
    beforeEach(() => {
      mockAuthStore.mockReturnValue({
        user: { id: 1, roles: [UserRole.STUDENT] },
      } as ReturnType<typeof useAuthStore>);
    });

    it("PENDING shows a View Details CTA to the status page", () => {
      mockUseTeacherApplication.mockReturnValue({
        data: { status: "PENDING", createdAt: "2026-01-01T00:00:00Z" },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTeacherApplication>);

      render(<TeacherApplicationBanner />);

      const ctas = screen.getAllByRole("link", { name: /View Details/ });
      expect(ctas.length).toBeGreaterThan(0);
      ctas.forEach((cta) =>
        expect(cta).toHaveAttribute("href", "/teacher/application/status"),
      );
    });

    it("REJECTED shows an Apply Again CTA to the form, the rejection reason, and a View details link", () => {
      mockUseTeacherApplication.mockReturnValue({
        data: {
          status: "REJECTED",
          createdAt: "2026-01-01T00:00:00Z",
          rejectionReason: "Missing certificate",
        },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTeacherApplication>);

      render(<TeacherApplicationBanner />);

      const ctas = screen.getAllByRole("link", { name: /Apply Again/ });
      expect(ctas.length).toBeGreaterThan(0);
      ctas.forEach((cta) =>
        expect(cta).toHaveAttribute("href", "/teacher/application"),
      );
      expect(screen.getAllByText("Missing certificate").length).toBeGreaterThan(0);
      const viewDetails = screen.getAllByRole("link", { name: "View details" });
      expect(viewDetails.length).toBeGreaterThan(0);
      viewDetails.forEach((link) =>
        expect(link).toHaveAttribute("href", "/teacher/application/status"),
      );
    });

    it("APPROVED renders nothing", () => {
      mockUseTeacherApplication.mockReturnValue({
        data: { status: "APPROVED", createdAt: "2026-01-01T00:00:00Z" },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useTeacherApplication>);

      const { container } = render(<TeacherApplicationBanner />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
