import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MyLearningPage from './MyLearningPage';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@edumind/user-ui', () => ({
  Loading: () => <div>Loading...</div>,
}));

vi.mock('../../stores/auth.store', () => ({
  useAuthStore: () => ({
    user: { id: 1, firstName: 'Tester' },
  }),
}));

vi.mock('../../services/enrollment.service', () => ({
  enrollmentService: {
    getMyEnrollmentStats: vi.fn(),
    getMyEnrollments: vi.fn(),
    getMyInProgressCourses: vi.fn(),
    getMyCompletedCourses: vi.fn(),
  },
}));

vi.mock('@edumind/shared-utils', () => ({
  buildRouteWithParams: () => '/mock-route',
  USER_ROUTES: {
    LEARNING_COURSE: '/learning/:courseSlug',
    COURSE_DETAIL: '/courses/:courseSlug',
    COURSES: '/courses',
  },
}));

vi.mock('./components', () => ({
  HeroSection: () => <div>Hero</div>,
  CourseFilters: ({ onFilterChange }: { onFilterChange: (filter: 'all' | 'active' | 'completed') => void }) => (
    <div>
      <button onClick={() => onFilterChange('all')}>All</button>
      <button onClick={() => onFilterChange('active')}>Active</button>
      <button onClick={() => onFilterChange('completed')}>Completed</button>
    </div>
  ),
  CourseList: () => <div>Course list</div>,
  LearningSidebar: () => <div>Sidebar</div>,
}));

import { useQuery } from '@tanstack/react-query';
import { enrollmentService } from '../../services/enrollment.service';

describe('MyLearningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.enabled === false) {
        return { data: undefined, isLoading: false } as any;
      }
      return { data: undefined, isLoading: false } as any;
    });
  });

  it('uses status=ACTIVE enrollments query for Active filter', async () => {
    render(<MyLearningPage />);

    fireEvent.click(screen.getByText('Active'));

    const activeQueryCall = vi
      .mocked(useQuery)
      .mock
      .calls
      .map((call) => call[0])
      .find((query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'enrollments' && query.queryKey[1] === 'me' && query.queryKey[3] === 'ACTIVE');

    expect(activeQueryCall).toBeDefined();
    if (!activeQueryCall || typeof activeQueryCall.queryFn !== 'function') {
      throw new Error('Active query function not found');
    }

    await activeQueryCall.queryFn({} as never);

    expect(enrollmentService.getMyEnrollments).toHaveBeenCalledWith({
      status: 'ACTIVE',
      page: 0,
      size: 12,
    });
    expect(enrollmentService.getMyInProgressCourses).not.toHaveBeenCalled();
  });
});
