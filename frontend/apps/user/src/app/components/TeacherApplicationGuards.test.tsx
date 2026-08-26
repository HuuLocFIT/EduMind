import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserRole } from "@edumind/shared-constants";
import { useAuthStore } from "../stores/auth.store";
import { useTeacherApplicationStatus } from "../hooks";
import {
  TeacherApplicationRoute,
  TeacherApplicationStatusRoute,
} from "./TeacherApplicationGuards";

vi.mock("../stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../hooks", () => ({
  useTeacherApplicationStatus: vi.fn(),
}));

vi.mock("./route-skeletons", () => ({
  TeacherApplicationSkeleton: () => <div>form-skeleton</div>,
  ApplicationStatusSkeleton: () => <div>status-skeleton</div>,
}));

const mockAuthStore = vi.mocked(useAuthStore);
const mockStatus = vi.mocked(useTeacherApplicationStatus);

const student = { id: 1, roles: [UserRole.STUDENT] };
const nonStudent = { id: 2, roles: [UserRole.TEACHER] };

const renderRoute = (path: string, element: ReactElement) => {
  const otherRoutes = [
    { path: "/", label: "home" },
    { path: "/teacher/application/status", label: "status-page" },
    { path: "/teacher/application", label: "form-page" },
  ].filter((route) => route.path !== path);

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={element}>
          <Route index element={<div>form-content</div>} />
        </Route>
        {otherRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<div>{route.label}</div>}
          />
        ))}
      </Routes>
    </MemoryRouter>,
  );
};

describe("TeacherApplicationRoute", () => {
  it("renders the outlet when the student has no application", () => {
    mockAuthStore.mockReturnValue({ user: student } as ReturnType<
      typeof useAuthStore
    >);
    mockStatus.mockReturnValue({
      isLoading: false,
      canApply: true,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute("/teacher/application", <TeacherApplicationRoute />);

    expect(screen.getByText("form-content")).toBeInTheDocument();
  });

  it("renders the form when the application was REJECTED (can reapply)", () => {
    mockAuthStore.mockReturnValue({ user: student } as ReturnType<
      typeof useAuthStore
    >);
    mockStatus.mockReturnValue({
      isLoading: false,
      canApply: true,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute("/teacher/application", <TeacherApplicationRoute />);

    expect(screen.getByText("form-content")).toBeInTheDocument();
  });

  it("redirects to status when PENDING", () => {
    mockAuthStore.mockReturnValue({ user: student } as ReturnType<
      typeof useAuthStore
    >);
    mockStatus.mockReturnValue({
      isLoading: false,
      canApply: false,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute("/teacher/application", <TeacherApplicationRoute />);

    expect(screen.getByText("status-page")).toBeInTheDocument();
  });

  it("redirects to status when APPROVED", () => {
    mockAuthStore.mockReturnValue({ user: student } as ReturnType<
      typeof useAuthStore
    >);
    mockStatus.mockReturnValue({
      isLoading: false,
      canApply: false,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute("/teacher/application", <TeacherApplicationRoute />);

    expect(screen.getByText("status-page")).toBeInTheDocument();
  });

  it("redirects home for a non-student", () => {
    mockAuthStore.mockReturnValue({ user: nonStudent } as ReturnType<
      typeof useAuthStore
    >);
    mockStatus.mockReturnValue({
      isLoading: false,
      canApply: true,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute("/teacher/application", <TeacherApplicationRoute />);

    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("renders the skeleton while loading", () => {
    mockAuthStore.mockReturnValue({ user: student } as ReturnType<
      typeof useAuthStore
    >);
    mockStatus.mockReturnValue({
      isLoading: true,
      canApply: true,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute("/teacher/application", <TeacherApplicationRoute />);

    expect(screen.getByText("form-skeleton")).toBeInTheDocument();
  });
});

describe("TeacherApplicationStatusRoute", () => {
  it("redirects to the form when there is no application", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: null,
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute(
      "/teacher/application/status",
      <TeacherApplicationStatusRoute />,
    );

    expect(screen.getByText("form-page")).toBeInTheDocument();
  });

  it("renders the outlet when an application exists", () => {
    mockStatus.mockReturnValue({
      isLoading: false,
      application: { status: "APPROVED" },
    } as ReturnType<typeof useTeacherApplicationStatus>);

    renderRoute(
      "/teacher/application/status",
      <TeacherApplicationStatusRoute />,
    );

    expect(screen.getByText("form-content")).toBeInTheDocument();
  });
});
