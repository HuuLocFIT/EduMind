import React from 'react';
import type { LessonResponse, LessonProgressResponse } from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import { Button, Card } from '@edumind/user-ui';
import { CheckCircle, Loader2 } from 'lucide-react';
import { ArticleViewer } from '../../../../components/learning/ArticleViewer';
import { LessonSummaryPanel } from '../../../../components/learning/LessonSummaryPanel';
import type { CompletionError } from '../course-player.types';
import { LessonNavigation } from './LessonNavigation';
import { LessonTranscriptCard } from './LessonTranscriptCard';
import { LessonResources } from './LessonResources';
import { QuizLauncher } from './QuizLauncher';

export interface StandardLessonContentProps {
  lesson: LessonResponse;
  currentLessonProgress: LessonProgressResponse | null;
  completingLessonId: number | null;
  completionError: CompletionError | null;
  lessonHasQuiz: boolean | null;
  lessonHeadingRef: React.RefObject<HTMLHeadingElement | null>;
  completionControlsRef: React.RefObject<HTMLDivElement | null>;
  onMarkComplete: () => void;
  onOpenQuiz: () => void;
  onDownloadTranscript: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export const StandardLessonContent: React.FC<StandardLessonContentProps> = ({
  lesson,
  currentLessonProgress,
  completingLessonId,
  completionError,
  lessonHasQuiz,
  lessonHeadingRef,
  completionControlsRef,
  onMarkComplete,
  onOpenQuiz,
  onDownloadTranscript,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  className,
}) => {
  return (
    <div className={`p-3 sm:p-6 bg-white ${className ?? ''}`} data-testid="lesson-content">
      <div className="max-w-4xl mx-auto">
        {/* Lesson Header */}
        <div
          ref={completionControlsRef}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6"
        >
          <div>
            <h2 ref={lessonHeadingRef} tabIndex={-1} className="text-2xl font-bold text-gray-900 mb-2">
              {lesson.title}
            </h2>
            {lesson.description && (
              <p className="text-gray-600">{lesson.description}</p>
            )}
          </div>

          {(!currentLessonProgress?.isCompleted || completingLessonId === lesson.id) && (
            <Button
              variant="primary"
              onClick={onMarkComplete}
              disabled={completingLessonId === lesson.id}
              aria-busy={completingLessonId === lesson.id}
              aria-label="Mark complete"
              className="flex-shrink-0"
            >
              {completingLessonId === lesson.id ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              Mark Complete
            </Button>
          )}

          {completionError && (
            <div role="alert" className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
              <p>{completionError.message}</p>
              <Button
                variant="secondary"
                onClick={completionError.retry}
                aria-label="Retry marking lesson complete"
                className="flex-shrink-0"
              >
                Retry
              </Button>
            </div>
          )}
        </div>

        {/* Lesson Content/Resources */}
        {lesson.articleContent && lesson.contentType === ContentType.ARTICLE && (
          <Card className="p-4 sm:p-8 mb-6">
            <ArticleViewer
              html={lesson.articleContent}
              title="Lesson Content"
            />
          </Card>
        )}

        {lesson.contentType === ContentType.VIDEO && (
          <LessonTranscriptCard
            articleContent={lesson.articleContent}
            hasCaptions={!!lesson.videoCaptionUrl}
            lessonTitle={lesson.title}
            onDownload={onDownloadTranscript}
          />
        )}

        {/* Take Quiz Button (for ARTICLE and VIDEO lessons) */}
        {(lesson.contentType === ContentType.ARTICLE ||
          lesson.contentType === ContentType.VIDEO) && (
          <>
            <QuizLauncher hasQuiz={lessonHasQuiz} onOpen={onOpenQuiz} />

            {/* AI Lesson Summary */}
            <LessonSummaryPanel lessonId={lesson.id} />

            {/* AI Course Tutor is now accessed via floating button & overlay */}
          </>
        )}

        {/* Resources */}
        <LessonResources resources={lesson.resources} />

        {/* Navigation Buttons */}
        <LessonNavigation
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPrevious={onPrevious}
          onNext={onNext}
        />
      </div>
    </div>
  );
};
