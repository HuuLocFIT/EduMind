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
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/apply">{children}</a>
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
});
