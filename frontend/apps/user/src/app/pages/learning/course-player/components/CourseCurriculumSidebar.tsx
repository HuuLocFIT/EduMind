import React, { useEffect, useState } from 'react';
import type { LessonResponse, SectionResponse } from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import {
  CheckCircle,
  ChevronDown,
  FileText,
  HelpCircle,
  Play,
  Video,
  X,
} from 'lucide-react';
import { ProgressBar } from '@edumind/user-ui';
import { useFocusTrap } from '../../../../hooks/useFocusTrap';

interface CourseCurriculumSidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  sections: SectionResponse[];
  lessons: LessonResponse[];
  currentLessonId: number;
  completedLessonIds: Set<number>;
  completedLessons: number;
  videoProgress: number;
  expandedSectionIds: number[];
  onToggleSection: (sectionId: number) => void;
  onSelectLesson: (lesson: LessonResponse) => void;
  onClose: () => void;
  activeLessonRef: React.RefObject<HTMLButtonElement | null>;
  sidebarScrollRef: React.RefObject<HTMLDivElement | null>;
  /**
   * True while course/curriculum data is still loading. Renders a skeleton
   * section list in place of the real header/lessons — the panel itself
   * (fixed w-80) stays mounted so it doesn't pop in/out separately from the
   * rest of the page shell.
   */
  loading?: boolean;
}

const contentTypeLabel = (lesson: LessonResponse) => {
  if (lesson.contentType === ContentType.VIDEO) {
    const minutes = lesson.videoDuration ? Math.round(lesson.videoDuration / 60) : 0;
    return `${minutes} min video`;
  }
  if (lesson.contentType === ContentType.ARTICLE) return 'Reading';
  if (lesson.contentType === ContentType.QUIZ) return 'Quiz';
  return 'Lesson';
};

export const CourseCurriculumSidebar: React.FC<CourseCurriculumSidebarProps> = ({
  isOpen,
  isDesktop,
  sections,
  lessons,
  currentLessonId,
  completedLessonIds,
  completedLessons,
  videoProgress,
  expandedSectionIds,
  onToggleSection,
  onSelectLesson,
  onClose,
  activeLessonRef,
  sidebarScrollRef,
  loading = false,
}) => {
  const drawerRef = useFocusTrap(!isDesktop && isOpen, onClose);
  const visible = isDesktop || isOpen;
  const [sectionAnnouncement, setSectionAnnouncement] = useState('');

  // The mobile curriculum is a modal drawer. Keep the page behind it fixed so
  // short viewports have one predictable scroll container instead of nested
  // page + curriculum scrolling.
  useEffect(() => {
    if (isDesktop || !isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDesktop, isOpen]);

  const handleToggleSection = (section: SectionResponse, isExpanded: boolean) => {
    onToggleSection(section.id);
    setSectionAnnouncement(`${section.title} ${isExpanded ? 'collapsed' : 'expanded'}`);
  };

  // Keep the controlled ID in the DOM while excluding the closed drawer from
  // the accessibility tree and tab order.
  if (!visible) return <div id="course-curriculum-drawer" hidden />;

  return (
    <>
      {!isDesktop && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/40 xl:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        id="course-curriculum-drawer"
        ref={drawerRef}
        role={!isDesktop ? 'dialog' : undefined}
        aria-modal={!isDesktop ? true : undefined}
        aria-labelledby="course-content-title"
        data-testid="course-sidebar"
        className="fixed bottom-0 right-0 top-16 z-40 h-[calc(100dvh-4rem)] min-h-0 w-full max-w-sm overflow-hidden border-l border-gray-200 bg-white xl:w-80 xl:max-w-none xl:translate-x-0"
      >
        <nav aria-labelledby="course-content-title" className="h-full min-h-0">
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {sectionAnnouncement}
          </p>
          <div ref={sidebarScrollRef} className="h-full min-h-0 overflow-y-auto overscroll-contain pb-4">
            {loading ? (
              <div aria-hidden="true">
                <div className="p-4 border-b bg-gray-50 animate-pulse">
                  <div className="h-5 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-44 bg-gray-200 rounded mt-2" />
                </div>
                <div className="p-2 space-y-4 animate-pulse">
                  {Array.from({ length: 3 }, (_, s) => (
                    <div key={s} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="h-3 w-32 bg-gray-200 rounded" />
                          <div className="h-2.5 w-20 bg-gray-200 rounded" />
                        </div>
                        <div className="w-4 h-4 bg-gray-200 rounded" />
                      </div>
                      <div className="mt-1 px-1 pb-2 pt-1">
                        {Array.from({ length: 3 }, (_, l) => (
                          <div key={l} className="p-3 rounded-lg mb-1 border-2 border-transparent">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200" />
                              <div className="flex-1 min-w-0">
                                <div className="h-4 w-full bg-gray-200 rounded" />
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="h-3 w-16 bg-gray-200 rounded" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
            <div className="flex items-start justify-between gap-3 border-b bg-gray-50 p-4 [@media(max-height:32rem)]:p-2">
              <div className="min-w-0">
                <h2 id="course-content-title" className="font-semibold text-gray-900">
                  Course Content
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {completedLessons} / {lessons.length} lessons completed
                </p>
              </div>
              {!isDesktop && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close course content"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="space-y-4 p-2 [@media(max-height:32rem)]:space-y-2 [@media(max-height:32rem)]:p-1">
              {sections
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((section) => {
                  const sectionLessons = lessons.filter((lesson) => lesson.sectionId === section.id);
                  if (sectionLessons.length === 0) return null;

                  const isExpanded = expandedSectionIds.includes(section.id);
                  const toggleId = `course-section-${section.id}-toggle`;
                  const panelId = `course-section-${section.id}-lessons`;

                  return (
                    <section key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <h3>
                        <button
                          id={toggleId}
                          type="button"
                          onClick={() => handleToggleSection(section, isExpanded)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                          aria-expanded={isExpanded}
                          aria-controls={panelId}
                        >
                          <span className="flex flex-col text-left">
                            <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                              {section.title}
                            </span>
                            <span className="text-[11px] text-gray-600">
                              {sectionLessons.length} lessons
                              {section.totalDurationMinutes ? ` • ${section.totalDurationMinutes} min` : ''}
                            </span>
                          </span>
                          <ChevronDown
                            aria-hidden="true"
                            className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </h3>

                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={toggleId}
                        hidden={!isExpanded}
                        className="mt-1 px-1 pb-2 pt-1"
                      >
                        <ol>
                          {sectionLessons.map((lesson) => {
                            const isCurrent = currentLessonId === lesson.id;
                            const isCompleted = completedLessonIds.has(lesson.id);
                            const globalIndex = lessons.findIndex((item) => item.id === lesson.id) + 1;

                            return (
                              <li key={lesson.id}>
                                <button
                                  ref={isCurrent ? activeLessonRef : null}
                                  type="button"
                                  onClick={() => onSelectLesson(lesson)}
                                  aria-current={isCurrent ? 'step' : undefined}
                                  aria-label={`${lesson.title}. ${contentTypeLabel(lesson)}${
                                    isCompleted ? '. Completed' : ''
                                  }`}
                                  data-testid="lesson-item"
                                  data-lesson-id={lesson.id}
                                  className={`mb-1 w-full rounded-lg border-2 p-3 text-left transition-colors [@media(max-height:32rem)]:p-2 ${
                                    isCurrent
                                      ? 'bg-blue-50 border-blue-600'
                                      : 'border-transparent hover:bg-gray-50'
                                  } cursor-pointer`}
                                >
                                  <span className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                      {isCompleted ? (
                                        <CheckCircle aria-hidden="true" className="w-5 h-5 text-green-600" />
                                      ) : isCurrent ? (
                                        <Play aria-hidden="true" className="w-4 h-4 text-blue-600" />
                                      ) : (
                                        <span className="text-sm font-medium text-gray-600">{globalIndex}</span>
                                      )}
                                    </span>

                                    <span className="flex-1 min-w-0">
                                      <span className={`block font-medium text-sm line-clamp-2 ${isCurrent ? 'text-blue-600' : 'text-gray-900'}`}>
                                        {lesson.title}
                                      </span>
                                      <span className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                                        {lesson.contentType === ContentType.VIDEO && <Video aria-hidden="true" className="w-3 h-3" />}
                                        {lesson.contentType === ContentType.ARTICLE && <FileText aria-hidden="true" className="w-3 h-3" />}
                                        {lesson.contentType === ContentType.QUIZ && <HelpCircle aria-hidden="true" className="w-3 h-3 text-purple-500" />}
                                        <span>{contentTypeLabel(lesson)}</span>
                                        <span className="sr-only">
                                          {'. '}
                                          {[
                                            isCompleted ? 'Completed' : 'Not completed',
                                            isCurrent ? 'Current lesson' : null,
                                          ].filter(Boolean).join(', ')}
                                        </span>
                                      </span>
                                    </span>
                                  </span>

                                  {isCurrent && lesson.contentType === ContentType.VIDEO && (
                                    <div className="mt-2">
                                      <ProgressBar progress={videoProgress} size="sm" color="blue" />
                                    </div>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    </section>
                  );
                })}
            </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
};
