import React, { useState } from "react";
import type { SectionDetailResponse } from "@edumind/shared-types";
import { Button } from "@edumind/user-ui";
import {
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Play,
} from "lucide-react";

const SECTION_PREVIEW_COUNT = 8;

const formatMinutesToLabel = (minutes?: number | null) => {
  if (!minutes || minutes <= 0) return null;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h${mins ? ` ${mins}m` : ""}`;
  return `${mins}m`;
};

const formatSecondsToLabel = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

export const CurriculumAccordion: React.FC<{
  sections: SectionDetailResponse[];
  isEnrolled: boolean;
}> = ({ sections, isEnrolled }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections[0] ? [sections[0].id] : [])
  );
  const [showAll, setShowAll] = useState(false);

  const visibleSections = showAll
    ? sections
    : sections.slice(0, SECTION_PREVIEW_COUNT);

  const allVisibleExpanded = visibleSections.every((s) =>
    expandedSections.has(s.id)
  );

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (allVisibleExpanded) {
      setExpandedSections(new Set());
      return;
    }

    setExpandedSections(
      (prev) => new Set([...prev, ...visibleSections.map((s) => s.id)])
    );
  };

  const remainingCount =
    sections.length > SECTION_PREVIEW_COUNT
      ? sections.length - SECTION_PREVIEW_COUNT
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 text-xs text-gray-700">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
            <BookOpen className="w-3.5 h-3.5" />
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            <Clock className="w-3.5 h-3.5" />
            {sections.reduce(
              (acc, s) => acc + (s.lessons?.length || s.lessonCount || 0),
              0
            )}{" "}
            lesson
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-[12px] whitespace-nowrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleAll}
            className="!px-0 !py-0 !rounded-none border-0 bg-transparent text-[12px] font-semibold text-blue-600 hover:underline hover:!bg-transparent active:!bg-transparent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
          >
            {allVisibleExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-200">
        {visibleSections.map((section, idx) => {
          const isOpen = expandedSections.has(section.id);
          const durationLabel = formatMinutesToLabel(
            section.totalDurationMinutes
          );
          const sectionOrder = String(idx + 1).padStart(2, "0");

          return (
            <div key={section.id}>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="mt-0.5 text-xs font-medium tracking-wide text-gray-500">
                    {sectionOrder}.
                  </span>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold text-[#111111] text-sm leading-5 truncate">
                      {section.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {section.lessons?.length ?? section.lessonCount ?? 0} lessons
                      </span>
                      {durationLabel && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {durationLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-4">
                  {
                    !isEnrolled && 
                    <span className="inline-flex items-center gap-1 text-gray-500 text-[11px] font-medium">
                      <Lock className="w-3.5 h-3.5" />
                    </span>}
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                      isOpen ? "rotate-90" : "rotate-0"
                    }`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 bg-gray-50/70 py-1">
                  {(section.lessons || []).map((lesson) => {
                    const duration = formatSecondsToLabel(lesson.videoDuration);
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-3 pl-9 border-b last:border-b-0 border-gray-200/70"
                      >
                        {lesson.contentType === "VIDEO" ? (
                          <Play className="w-3.5 h-3.5 text-gray-500" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 leading-5">
                            {lesson.title}
                          </p>
                          {duration && (
                            <p className="text-xs text-gray-500">{duration}</p>
                          )}
                        </div>
                        {lesson.isPreview && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] rounded-full shadow-sm">
                            Preview
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {(section.lessons || []).length === 0 && (
                    <div className="px-4 py-4 pl-9 text-sm text-gray-500">
                      Lessons coming soon
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {remainingCount > 0 && !showAll && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setShowAll(true)}>
            Show more sections (+{remainingCount})
          </Button>
        </div>
      )}
    </div>
  );
};
