import React from 'react';
import { Button, ProgressBar } from '@edumind/user-ui';
import { ChevronLeft, List, X } from 'lucide-react';

export interface CoursePlayerHeaderProps {
  courseTitle: string;
  progressPercentage: number;
  sidebarOpen: boolean;
  sidebarToggleRef: React.RefObject<HTMLButtonElement | null>;
  onExit: () => void;
  onToggleSidebar: () => void;
  /**
   * True while course data is still loading. Keeps the exact same grid
   * structure and swaps only the title/progress content for skeleton bars,
   * so the header never reflows when the real data arrives.
   */
  loading?: boolean;
  className?: string;
}

export const CoursePlayerHeader: React.FC<CoursePlayerHeaderProps> = ({
  courseTitle,
  progressPercentage,
  sidebarOpen,
  sidebarToggleRef,
  onExit,
  onToggleSidebar,
  loading = false,
  className,
}) => {
  return (
    <header
      className={`bg-gray-800 border-b border-gray-700 sticky top-16 z-20 ${
        sidebarOpen ? 'xl:mr-80' : ''
      } ${className ?? ''}`}
    >
      <div className="px-3 sm:px-4 py-3 grid grid-cols-[3rem_1fr_3rem] xl:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 xl:gap-4">
        <Button
          variant="secondary"
          onClick={onExit}
          className="h-12 w-12 xl:h-auto xl:w-auto p-0 xl:px-4 xl:py-2 justify-center bg-gray-700 hover:bg-gray-600"
          aria-label="Exit course player and return to My Learning"
        >
          <ChevronLeft aria-hidden="true" className="w-5 h-5" />
          <span className="hidden xl:inline">Exit</span>
        </Button>

        <h1 className="text-white font-semibold text-center xl:text-left truncate px-1 xl:px-0">
          {loading ? (
            <span
              className="inline-block h-5 xl:h-6 w-40 xl:w-64 max-w-full bg-gray-700 rounded animate-pulse align-middle"
              aria-hidden="true"
            />
          ) : (
            courseTitle
          )}
        </h1>

        <button
          ref={sidebarToggleRef}
          type="button"
          onClick={onToggleSidebar}
          className="h-12 w-12 p-0 inline-flex xl:hidden items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={sidebarOpen ? 'Close course content' : 'Open course content'}
          aria-expanded={sidebarOpen}
          aria-controls="course-curriculum-drawer"
        >
          {sidebarOpen ? <X aria-hidden="true" className="w-5 h-5" /> : <List aria-hidden="true" className="w-5 h-5" />}
        </button>

        <div className="hidden xl:flex items-center gap-3">
          {loading ? (
            <>
              <div className="h-4 w-40 bg-gray-700 rounded animate-pulse" aria-hidden="true" />
              <div className="w-32">
                <div className="h-1.5 w-full bg-gray-700 rounded-full animate-pulse" aria-hidden="true" />
              </div>
            </>
          ) : (
            <>
              <span className="text-gray-300 text-sm whitespace-nowrap">
                Course Progress: {progressPercentage || 0}%
              </span>
              <div className="w-32" data-testid="progress-bar">
                <ProgressBar
                  progress={progressPercentage || 0}
                  size="sm"
                  color="green"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
