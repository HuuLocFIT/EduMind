import React from 'react';
import { ArticleViewer } from '../../../../components/learning/ArticleViewer';
import { Button, Card } from '@edumind/user-ui';
import { Download, FileText } from 'lucide-react';

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
  return (
    <Card className={`p-4 sm:p-5 mb-6 ${className ?? ''}`}>
      <section aria-labelledby="lesson-transcript-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
              <FileText className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="lesson-transcript-heading" className="text-sm font-medium text-slate-800">
                Transcript
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {articleContent
                  ? 'Read the transcript or download it as text.'
                  : hasCaptions
                    ? 'Captions may be available in the player.'
                    : 'No transcript is attached to this video.'}
              </p>
            </div>
          </div>
          {articleContent && (
            <Button
              type="button"
              variant="secondary"
              onClick={onDownload}
              className="flex items-center gap-2"
              aria-label={`Download transcript for ${lessonTitle}`}
            >
              <Download aria-hidden="true" className="w-4 h-4" />
            </Button>
          )}
        </div>
        {articleContent ? (
          <div className="mt-4">
            <ArticleViewer html={articleContent} title="Transcript" />
          </div>
        ) : (
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
