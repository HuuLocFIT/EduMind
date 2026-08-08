import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { CourseResponse } from '@edumind/shared-types';
import { HomePage } from './HomePage';

const mockUseQuery = vi.fn();
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock('@edumind/user-ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  StatCard: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('lucide-react', () => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} />;
  return {
    ArrowRight: Icon, Award: Icon, BookOpen: Icon, CheckCircle2: Icon,
    Clock: Icon, Sparkles: Icon, Star: Icon, TrendingUp: Icon, Users: Icon, Video: Icon,
  };
});

vi.mock('../../components/Seo/SeoMetaTags', () => ({ SeoMetaTags: () => null }));
vi.mock('../../components/course-module', () => ({
  CourseGridSkeleton: () => <div data-testid="course-skeleton" aria-hidden="true" />,
  CourseGrid: ({ courses, ariaLabel }: { courses: CourseResponse[]; ariaLabel: string }) =>
    courses.length ? (
      <div role="list" aria-label={ariaLabel}>
        {courses.map((course) => (
          <a key={course.id} href={`/courses/${course.slug}`}>{course.title}</a>
        ))}
      </div>
    ) : <div role="status">No courses found</div>,
}));

const course = {
  id: 1,
  slug: 'accessible-react',
  title: 'Accessible React',
} as CourseResponse;

const renderPage = () => render(<MemoryRouter><HomePage /></MemoryRouter>);

describe('HomePage accessibility states', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loaded course regions, semantic navigation links, and one h1', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: [course], isLoading: false, isError: false, refetch: vi.fn() })
      .mockReturnValueOnce({ data: [course], isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Featured Courses' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Most Popular Courses' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Accessible React' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Browse Courses' }).length).toBeGreaterThan(0);
  });

  it('announces both loading states while hiding skeletons', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getByText('Loading featured courses')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Loading popular courses')).toHaveAttribute('role', 'status');
    expect(screen.getAllByTestId('course-skeleton')).toHaveLength(2);
  });

  it('exposes an empty status for each successfully loaded empty collection', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });

    renderPage();

    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.getAllByText('No courses found')).toHaveLength(2);
  });

  it('announces query errors and retries the failed collection', async () => {
    const retryFeatured = vi.fn();
    const retryPopular = vi.fn();
    mockUseQuery
      .mockReturnValueOnce({ data: [], isLoading: false, isError: true, refetch: retryFeatured })
      .mockReturnValueOnce({ data: [], isLoading: false, isError: true, refetch: retryPopular });

    renderPage();
    expect(screen.getAllByRole('alert')).toHaveLength(2);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Retry loading featured courses' }));
    await user.click(screen.getByRole('button', { name: 'Retry loading popular courses' }));
    expect(retryFeatured).toHaveBeenCalledOnce();
    expect(retryPopular).toHaveBeenCalledOnce();
  });
});
