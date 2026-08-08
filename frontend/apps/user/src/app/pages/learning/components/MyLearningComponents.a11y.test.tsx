import React from 'react';
import axe from 'axe-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { EnrollmentResponse, EnrollmentStatsResponse } from '@edumind/shared-types';
import { EnrollmentStatus } from '@edumind/shared-constants';
import { CourseFilters } from './CourseFilters';
import { CourseList } from './CourseList';
import { EnrollmentCardNew } from './EnrollmentCardNew';

const assertNoSeriousViolations = async (container: HTMLElement) => {
  const result = await axe.run(container, {
    resultTypes: ['violations'],
  });
  expect(result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')).toEqual([]);
};

const enrollment = {
  id: 7,
  courseId: 42,
  courseSlug: 'accessible-react',
  courseTitle: 'Accessible React',
  courseThumbnail: '',
  courseIsPaid: false,
  status: EnrollmentStatus.ACTIVE,
  progressPercentage: 40,
  completedLessons: 4,
  totalLessons: 10,
  enrolledAt: '2026-01-01T00:00:00.000Z',
} as EnrollmentResponse;

const stats = { total: 3, active: 2, completed: 1 } as EnrollmentStatsResponse;

const renderCourseList = (props: Partial<React.ComponentProps<typeof CourseList>> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CourseList
        enrollments={[]}
        currentPage={0}
        filterStatus="all"
        hoveredCourse={null}
        onPageChange={vi.fn()}
        onHoverCourse={vi.fn()}
        onContinue={vi.fn()}
        onViewDetails={vi.fn()}
        onBrowseCourses={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
};

describe('My Learning component accessibility', () => {
  it.each([
    ['all', 'No courses here yet', 'Courses you enroll in will appear here.'],
    ['active', 'No active courses here yet', 'Courses you are currently learning will appear here.'],
    ['completed', 'No completed courses here yet', 'Courses you complete will appear here.'],
  ] as const)('provides an announced, state-specific empty view for %s', async (filterStatus, heading, copy) => {
    const { container } = renderCourseList({ filterStatus });

    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent(`${heading}. ${copy}`);
    expect(statuses[0]).not.toHaveTextContent('Browse Courses');
    expect(screen.getByRole('heading', { level: 3, name: heading })).toBeInTheDocument();
    expect(screen.getByText(copy)).toBeInTheDocument();
    await assertNoSeriousViolations(container);
  });

  it('hides loading placeholders and announces loading', async () => {
    const { container } = renderCourseList({ isLoading: true });

    expect(screen.getByRole('status')).toHaveTextContent('Loading courses');
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
    await assertNoSeriousViolations(container);
  });

  it('uses article and heading semantics while preserving explorable course details', async () => {
    const { container } = renderCourseList({ enrollments: [enrollment] });

    expect(screen.getByRole('list', { name: 'all courses' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('article', { name: 'Accessible React' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accessible React', level: 3 })).toBeInTheDocument();
    expect(screen.getByText('In progress. Free course')).toBeInTheDocument();
    expect(screen.getByText('10 lessons', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Accessible React progress' })).toHaveAttribute('aria-valuetext', '40% complete');
    expect(screen.getByText('4 of 10 lessons completed', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Enrolled Jan 1, 2026', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await assertNoSeriousViolations(container);
  });

  it('activates Continue Learning with Enter using a course-specific name', async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      <EnrollmentCardNew
        enrollment={enrollment}
        isHovered={false}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
        onContinue={onContinue}
        onViewDetails={vi.fn()}
      />,
    );

    const button = screen.getByTestId('continue-learning-button');
    expect(button).toHaveAccessibleName('Continue learning Accessible React');
    button.focus();
    await user.keyboard('{Enter}');
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('has no serious Axe violations in every tab state', async () => {
    const user = userEvent.setup();
    const Wrapper = () => {
      const [value, setValue] = React.useState<'all' | 'active' | 'completed'>('all');
      return <CourseFilters activeFilter={value} onFilterChange={setValue} stats={stats}><p>Course results</p></CourseFilters>;
    };
    const { container } = render(<Wrapper />);

    for (const name of ['All, 3 courses', 'In Progress, 2 courses', 'Completed, 1 course']) {
      await user.click(screen.getByRole('tab', { name }));
      await assertNoSeriousViolations(container);
    }
  });
});
