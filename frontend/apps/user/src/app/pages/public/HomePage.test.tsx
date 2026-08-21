import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { CategoryResponse, CourseResponse } from "@edumind/shared-types";
import { UserRole } from "@edumind/shared-constants";
import { HomePage } from "./HomePage";

const mockUseQuery = vi.fn();
const mockAuth = vi.fn();
vi.mock("@tanstack/react-query", () => ({ useQuery: (...args: unknown[]) => mockUseQuery(...args) }));
vi.mock("../../stores/auth.store", () => ({ useAuthStore: () => mockAuth() }));
vi.mock("@edumind/user-ui", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  CloudinaryImage: ({ alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
}));
vi.mock("lucide-react", () => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    ArrowRight: Icon, Award: Icon, BarChart3: Icon, BookOpen: Icon, BookOpenCheck: Icon, Bot: Icon,
    Captions: Icon, CheckCircle2: Icon, Compass: Icon, GraduationCap: Icon,
    LayoutGrid: Icon, ListChecks: Icon, Play: Icon, PlayCircle: Icon, Search: Icon, Sparkles: Icon,
    Users: Icon, WalletCards: Icon,
  };
});
vi.mock("../../components/Seo/SeoMetaTags", () => ({ SeoMetaTags: () => null }));
vi.mock("../../components/course-module", () => ({
  CourseGridSkeleton: () => <div data-testid="course-skeleton" aria-hidden="true" />,
  CourseGrid: ({ courses, ariaLabel, onCourseClick }: { courses: CourseResponse[]; ariaLabel: string; onCourseClick: (course: CourseResponse) => void }) =>
    courses.length ? <div role="list" aria-label={ariaLabel}>{courses.map((course) => <button key={course.id} onClick={() => onCourseClick(course)}>{course.title}</button>)}</div> : <div role="status">No courses found</div>,
}));

const course = { id: 1, slug: "accessible-react", title: "Accessible React" } as CourseResponse;
const category = { id: 7, name: "Web Development", slug: "web-development", courseCount: 12 } as CategoryResponse;

const Location = () => <span data-testid="location">{useLocation().pathname}{useLocation().search}</span>;
const renderPage = () => render(<MemoryRouter><HomePage /><Location /></MemoryRouter>);
const loadedQueries = () => {
  mockUseQuery.mockImplementation((options: { queryKey: readonly unknown[] }) =>
    options.queryKey[0] === "categories"
      ? { data: [category], isLoading: false, isError: false, refetch: vi.fn() }
      : { data: [course], isLoading: false, isError: false, refetch: vi.fn() },
  );
};

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReturnValue({ isAuthenticated: false, user: null });
  });

  it("renders semantic product content, real data regions, and no unsupported claims", () => {
    loadedQueries();
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Explore by category" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Top-rated courses" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Top-rated courses" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Web Development/ })).toHaveAttribute("href", "/courses?categories=7");
    expect(screen.queryByText(/50,000|1,000\+|95%|live classes|free trial|cancel anytime/i)).not.toBeInTheDocument();
  });

  it("submits trimmed, encoded search and ignores an empty search", async () => {
    loadedQueries();
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Search courses" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    await user.type(screen.getByLabelText("What do you want to learn?"), "  React & UX  ");
    await user.click(screen.getByRole("button", { name: "Search courses" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/courses?q=React%20%26%20UX");
  });

  it("announces independent loading and empty states", () => {
    mockUseQuery
      .mockReturnValueOnce({ data: [], isLoading: true, isError: false, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [], isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole("status", { name: "Loading course categories" })).toBeInTheDocument();
    expect(screen.getByText("No courses found")).toHaveAttribute("role", "status");
  });

  it("retries category and course failures independently", async () => {
    const retryCategories = vi.fn();
    const retryCourses = vi.fn();
    mockUseQuery
      .mockReturnValueOnce({ data: [], isLoading: false, isError: true, refetch: retryCategories })
      .mockReturnValueOnce({ data: [], isLoading: false, isError: true, refetch: retryCourses });
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry loading course categories" }));
    await user.click(screen.getByRole("button", { name: "Retry loading top-rated courses" }));
    expect(retryCategories).toHaveBeenCalledOnce();
    expect(retryCourses).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("shows guest destinations", () => {
    loadedQueries();
    renderPage();
    expect(screen.getByRole("link", { name: "Start learning" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Create your free account" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: /Teach on EduMind/ })).toHaveAttribute("href", "/signup");
  });

  it("shows student destinations", () => {
    mockAuth.mockReturnValue({ isAuthenticated: true, user: { roles: [UserRole.STUDENT] } });
    loadedQueries();
    renderPage();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Continue learning" })).toHaveAttribute("href", "/learning");
    expect(screen.getByRole("link", { name: /Teach on EduMind/ })).toHaveAttribute("href", "/teacher/application");
  });

  it("shows teacher destinations", () => {
    mockAuth.mockReturnValue({ isAuthenticated: true, user: { roles: [UserRole.TEACHER] } });
    loadedQueries();
    renderPage();
    expect(screen.getByRole("link", { name: /Open teacher dashboard/ })).toHaveAttribute("href", "/teacher/dashboard");
    expect(screen.getByRole("link", { name: "Go to teacher dashboard" })).toHaveAttribute("href", "/teacher/dashboard");
  });
});
