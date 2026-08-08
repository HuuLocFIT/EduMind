import React from 'react';
import { ArticleViewer } from '../../../../components/learning/ArticleViewer';
import { AutoHeightTransition } from '../../../../components/ui/AutoHeightTransition';
import { Button, Card } from '@edumind/user-ui';
import { ChevronDown, Download, FileText } from 'lucide-react';

export interface LessonTranscriptCardProps {
  articleContent: string | null | undefined;
  hasCaptions: boolean;
  lessonTitle: string;
  onDownload: () => void;
  className?: string;
}

export const LessonTranscriptCard: React.FC<LessonTranscriptCardProps> = ({
  articleContent,
  hasCaptions,
  lessonTitle,
  onDownload,
  className,
}) => {
  const [isTranscriptOpen, setIsTranscriptOpen] = React.useState(false);
  const headingId = React.useId();
  const transcriptRegionId = React.useId();
  const hasTranscript = !!articleContent;
  const transcriptHtml = articleContent ?? '';
  const headerContent = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
          <FileText className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 id={headingId} className="text-sm font-medium text-slate-800">
            Transcript
          </h3>
          <p className="text-xs text-slate-500">
            {hasTranscript
              ? 'Available for reference without taking over the lesson view.'
              : hasCaptions
                ? 'Captions may be available in the player.'
                : 'No transcript is attached to this video.'}
          </p>
        </div>
      </div>
      {hasTranscript && (
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform group-hover:text-slate-600 ${
            isTranscriptOpen ? 'rotate-180' : ''
          }`}
        />
      )}
    </>
  );

  return (
    <Card className={`p-4 sm:p-5 mb-6 ${className ?? ''}`}>
      <section aria-labelledby={headingId}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {hasTranscript ? (
            <button
              type="button"
              aria-expanded={isTranscriptOpen}
              aria-controls={transcriptRegionId}
              onClick={() => setIsTranscriptOpen((open) => !open)}
              className="group -m-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {headerContent}
            </button>
          ) : (
            <div className="-m-2 flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg p-2">
              {headerContent}
            </div>
          )}

          {hasTranscript && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onDownload}
                className="min-h-9"
                aria-label={`Download transcript for ${lessonTitle}`}
              >
                <Download aria-hidden="true" className="w-4 h-4" />
                Download
              </Button>
            </div>
          )}
        </div>

        <AutoHeightTransition transitionKey={isTranscriptOpen ? 'open' : 'closed'}>
          {hasTranscript && isTranscriptOpen && (
            <div
              id={transcriptRegionId}
              role="region"
              aria-label="Transcript content"
              className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
            >
              <ArticleViewer html={transcriptHtml} />
            </div>
          )}
        </AutoHeightTransition>

        {!hasTranscript && (
          <p role="note" className="text-sm text-slate-500 mt-3">
            A transcript is not available for this video.
            {hasCaptions
              ? ' Captions may be available in the video player.'
              : ''}
          </p>
        )}
      </section>
    </Card>
  );
};
