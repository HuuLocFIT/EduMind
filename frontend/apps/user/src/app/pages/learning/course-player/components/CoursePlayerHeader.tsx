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
  trailingAction?: React.ReactNode;
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
  trailingAction,
}) => {
  return (
    <header
      className={`relative sticky top-16 z-20 border-b border-gray-700 bg-gray-800 [@media(max-height:32rem)]:static ${
        sidebarOpen ? 'xl:mr-80' : ''
      } ${className ?? ''}`}
    >
      <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 px-3 py-3 [@media(max-height:32rem)]:grid-cols-[2.5rem_1fr_2.5rem] [@media(max-height:32rem)]:gap-2 [@media(max-height:32rem)]:py-1 sm:px-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-4 xl:pr-40">
        <Button
          variant="secondary"
          onClick={onExit}
          className="h-12 w-12 justify-center bg-gray-700 p-0 hover:bg-gray-600 [@media(max-height:32rem)]:h-10 [@media(max-height:32rem)]:w-10 xl:h-auto xl:w-auto xl:px-4 xl:py-2"
          aria-label="Exit course player and return to My Learning"
        >
          <ChevronLeft aria-hidden="true" className="w-5 h-5" />
          <span className="hidden xl:inline">Exit</span>
        </Button>

        <h1 className="truncate px-1 text-center font-semibold text-white [@media(max-height:32rem)]:pr-12 [@media(max-height:32rem)]:text-sm xl:px-0 xl:text-left">
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
          className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gray-700 p-0 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 [@media(max-height:32rem)]:h-10 [@media(max-height:32rem)]:w-10 xl:hidden"
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
      {trailingAction}
    </header>
  );
};
