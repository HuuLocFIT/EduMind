import React, { useEffect, useState } from 'react';
import { Card } from '@edumind/user-ui';
import { BookOpen, Sparkles } from 'lucide-react';
import { aiService } from '../../services/ai.service';
import type { LessonSummaryResponse } from '@edumind/shared-types';

interface LessonSummaryPanelProps {
  lessonId: number;
}

export const LessonSummaryPanel: React.FC<LessonSummaryPanelProps> = ({ lessonId }) => {
  const [summary, setSummary] = useState<LessonSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    aiService
      .getSummaryByLesson(lessonId)
      .then((result) => {
        if (!isMounted) return;
        setSummary(result);
      })
      .catch(() => {
        if (!isMounted) return;
        setSummary(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-full bg-indigo-50">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            AI Lesson Summary
            <BookOpen className="w-4 h-4 text-gray-500" />
          </h3>
          <p className="text-xs text-gray-500">
            Key points and IT vocabulary generated from this lesson&apos;s content.
          </p>
        </div>
      </div>

      {loading && !summary && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      )}

      {!loading && !summary && (
        <p className="text-sm text-gray-500">
          AI summary not yet generated for this lesson.
        </p>
      )}

      {summary && (
        <div className={`space-y-4 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          {/* Summary Text */}
          <section>
            <h4 className="font-semibold text-gray-900 mb-1">Summary</h4>
            <p className="text-gray-700 whitespace-pre-line">
              {summary.summaryText}
            </p>
          </section>

          {/* Key Points */}
          {summary.keyPoints && summary.keyPoints.length > 0 && (
            <section>
              <h4 className="font-semibold text-gray-900 mb-1">Key Points</h4>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                {summary.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Vocabulary */}
          {summary.vocabulary && summary.vocabulary.length > 0 && (
            <section>
              <h4 className="font-semibold text-gray-900 mb-1">Vocabulary</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {summary.vocabulary.map((item, index) => (
                  <div
                    key={`${item.term}-${index}`}
                    className="border border-gray-200 rounded-md p-3 bg-gray-50"
                  >
                    <p className="font-semibold text-gray-900">
                      {item.term}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Card>
  );
};

export default LessonSummaryPanel;

