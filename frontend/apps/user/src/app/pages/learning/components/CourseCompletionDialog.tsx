import React, { useEffect, useRef } from 'react';
import { Button } from '@edumind/user-ui';
import { CheckCircle, ChevronRight, Trophy, X } from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface CourseCompletionDialogProps {
  courseTitle: string;
  onBackToLearning: () => void;
  onStay: () => void;
}

export const CourseCompletionDialog: React.FC<CourseCompletionDialogProps> = ({
  courseTitle,
  onBackToLearning,
  onStay,
}) => {
  const dialogRef = useFocusTrap(true, onStay);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm sm:px-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-complete-heading"
        aria-describedby="course-complete-description"
        className="relative isolate w-full max-w-3xl overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-10 text-center shadow-2xl shadow-slate-950/30 sm:px-12 sm:py-12"
      >
        <div aria-hidden="true" className="absolute -left-24 -top-24 -z-10 h-64 w-64 rounded-full bg-blue-200/50 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-28 -right-20 -z-10 h-72 w-72 rounded-full bg-indigo-200/50 blur-3xl" />

        <button
          type="button"
          onClick={onStay}
          aria-label="Close course completion dialog and review course"
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25 ring-8 ring-amber-50">
          <Trophy aria-hidden="true" className="h-10 w-10 text-white" />
        </div>

        <p className="mt-7 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
          Achievement unlocked
        </p>
        <h2
          id="course-complete-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-3xl font-bold tracking-tight text-slate-900 focus:outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 sm:text-4xl"
        >
          Course completed
        </h2>
        <p
          id="course-complete-description"
          role="status"
          className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg"
        >
          You completed {courseTitle}.
        </p>

        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-left">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle aria-hidden="true" className="h-5 w-5 text-emerald-600" />
              Course progress
            </span>
            <span className="text-sm font-bold text-emerald-700">100%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100" aria-hidden="true">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <Button
            variant="secondary"
            onClick={onStay}
            className="min-h-12 w-full justify-center rounded-xl px-6 text-base sm:w-auto"
          >
            Stay and review course
          </Button>
          <Button
            variant="primary"
            onClick={onBackToLearning}
            className="min-h-12 w-full justify-center rounded-xl px-6 text-base shadow-lg shadow-blue-600/20 sm:w-auto"
          >
            Back to My Learning
            <ChevronRight aria-hidden="true" className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
