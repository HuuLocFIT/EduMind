import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserRole } from "@edumind/shared-constants";
import { MainLayout } from "./MainLayout";

const mockAuthState = vi.hoisted(() => ({
  state: {
    isAuthenticated: true,
    user: {
      id: 1,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      roles: ["ROLE_STUDENT"] as string[],
    },
    logout: vi.fn(),
  },
}));

const mockStatusState = vi.hoisted(() => ({
  hasApplication: false,
  isRejected: false,
}));

vi.mock("../stores/auth.store", () => ({
  useAuthStore: (
    selector?: (value: typeof mockAuthState.state) => unknown,
  ) => (selector ? selector(mockAuthState.state) : mockAuthState.state),
}));

vi.mock("../hooks", () => ({
  useTeacherApplicationStatus: () => mockStatusState,
  useAuthUiReady: () => true,
}));

vi.mock("../components/payment-module", () => ({
  CartIcon: () => <button type="button">Cart</button>,
  CartDrawer: () => null,
}));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={["/courses"]}>
      <Routes>
        <Route path="/courses" element={<MainLayout />}>
          <Route index element={<h1>Courses</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const openUserMenu = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "User menu" }));
  return within(screen.getByRole("menu", { name: "User account options" }));
};

describe("MainLayout teacher application menu", () => {
  beforeEach(() => {
    mockAuthState.state.user.roles = [UserRole.STUDENT as string];
    mockStatusState.hasApplication = false;
    mockStatusState.isRejected = false;
  });

  it("shows only Become a Teacher when the student has no application (desktop menu)", async () => {
    renderLayout();
    const menu = await openUserMenu();

    expect(menu.getByRole("menuitem", { name: /Become a Teacher/ })).toBeInTheDocument();
    expect(menu.queryByRole("menuitem", { name: /Application Status/ })).not.toBeInTheDocument();
  });

  it("shows only Application Status while PENDING (desktop menu)", async () => {
    mockStatusState.hasApplication = true;
    mockStatusState.isRejected = false;
    renderLayout();
    const menu = await openUserMenu();

    expect(menu.getByRole("menuitem", { name: /Application Status/ })).toBeInTheDocument();
    expect(menu.queryByRole("menuitem", { name: /Become a Teacher/ })).not.toBeInTheDocument();
    expect(menu.queryByRole("menuitem", { name: /Apply Again/ })).not.toBeInTheDocument();
  });

  it("shows both Application Status and Apply Again when REJECTED (desktop menu)", async () => {
    mockStatusState.hasApplication = true;
    mockStatusState.isRejected = true;
    renderLayout();
    const menu = await openUserMenu();

    expect(menu.getByRole("menuitem", { name: /Application Status/ })).toBeInTheDocument();
    expect(menu.getByRole("menuitem", { name: /Apply Again/ })).toBeInTheDocument();
  });

  it("shows Application Status and Teacher Dashboard (not Become a Teacher) when APPROVED", async () => {
    mockAuthState.state.user.roles = [UserRole.STUDENT, UserRole.TEACHER];
    mockStatusState.hasApplication = true;
    mockStatusState.isRejected = false;
    renderLayout();
    const menu = await openUserMenu();

    expect(menu.getByRole("menuitem", { name: /Application Status/ })).toBeInTheDocument();
    expect(menu.getByRole("menuitem", { name: /Teacher Dashboard/ })).toBeInTheDocument();
    expect(menu.queryByRole("menuitem", { name: /Become a Teacher/ })).not.toBeInTheDocument();
  });

  it("mirrors the same three states in the mobile menu", async () => {
    mockStatusState.hasApplication = true;
    mockStatusState.isRejected = true;
    renderLayout();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const mobileNav = within(screen.getByRole("navigation", { name: "Mobile navigation" }));

    expect(mobileNav.getByText("Application Status")).toBeInTheDocument();
    expect(mobileNav.getByText("Apply Again")).toBeInTheDocument();
  });
});
