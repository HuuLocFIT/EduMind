import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import type { CategoryResponse, EnrollmentResponse } from '@edumind/shared-types';
import { DashboardEnrollmentCard } from './DashboardEnrollmentCard';
import { DashboardSidebar } from './DashboardSidebar';

vi.mock('@edumind/user-ui', () => ({
  CloudinaryImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const category = {
  id: 12,
  name: 'Web Development',
  slug: 'web-development',
  courseCount: 4,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} satisfies CategoryResponse;

const enrollment = {
  id: 1,
  courseId: 2,
  courseSlug: 'react-basics',
  courseTitle: 'React Basics',
  courseThumbnail: null,
  completedLessons: 3,
  totalLessons: 10,
  progressPercentage: 30,
} as EnrollmentResponse;

describe('Dashboard components', () => {
  it('offers only real quick actions and category navigation', async () => {
    const user = userEvent.setup();
    const actions = {
      learning: vi.fn(),
      courses: vi.fn(),
      wishlist: vi.fn(),
      certificates: vi.fn(),
      category: vi.fn(),
    };

    render(
      <DashboardSidebar
        wishlistCount={3}
        categories={[category]}
        onGoToLearning={actions.learning}
        onBrowseCourses={actions.courses}
        onGoToWishlist={actions.wishlist}
        onGoToCertificates={actions.certificates}
        onCategoryClick={actions.category}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'My Learning' }));
    await user.click(screen.getByRole('button', { name: 'Browse Courses' }));
    await user.click(screen.getByRole('button', { name: /My Wishlist/ }));
    await user.click(screen.getByRole('button', { name: 'Certificates' }));
    await user.click(screen.getByRole('button', { name: /Web Development/ }));

    expect(actions.learning).toHaveBeenCalledOnce();
    expect(actions.courses).toHaveBeenCalledOnce();
    expect(actions.wishlist).toHaveBeenCalledOnce();
    expect(actions.certificates).toHaveBeenCalledOnce();
    expect(actions.category).toHaveBeenCalledWith(12);
    expect(screen.getByText('4 courses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse all categories/ })).toBeInTheDocument();
    expect(screen.queryByText(/Learning Goals|Current Streak|Upcoming/i)).not.toBeInTheDocument();
  });

  it('renders compact course progress with an accessible continue action', async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <DashboardEnrollmentCard enrollment={enrollment} onContinue={onContinue} />,
    );

    expect(screen.getByText('3 of 10 lessons completed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'React Basics progress' })).toHaveAttribute('aria-valuenow', '30');
    expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue React Basics' }));
    expect(onContinue).toHaveBeenCalledOnce();
    const result = await axe.run(container, { resultTypes: ['violations'] });
    expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
  });

  it('labels a zero-progress course as Start', () => {
    render(
      <DashboardEnrollmentCard
        enrollment={{ ...enrollment, progressPercentage: 0, completedLessons: 0 }}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Start React Basics' })).toBeInTheDocument();
  });
});
