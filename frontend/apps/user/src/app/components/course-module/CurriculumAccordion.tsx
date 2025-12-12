import React, { useState } from "react";
import type { SectionDetailResponse } from "@edumind/shared-types";
import { Button, Card } from "@edumind/user-ui";
import {
  BookOpen,
  CheckCircle,
  ChevronDown,
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

  const handleExpandAll = () => {
    if (allVisibleExpanded) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(visibleSections.map((s) => s.id)));
    }
  };

  const remainingCount =
    sections.length > SECTION_PREVIEW_COUNT
      ? sections.length - SECTION_PREVIEW_COUNT
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
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
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExpandAll}
            className="w-full sm:w-auto"
          >
            {allVisibleExpanded ? "Collapse All" : "Expand All"}
          </Button>
          {remainingCount > 0 && !showAll && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAll(true)}
              className="w-full sm:w-auto"
            >
              Show more (+{remainingCount})
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {visibleSections.map((section, idx) => {
          const isOpen = expandedSections.has(section.id);
          const durationLabel = formatMinutesToLabel(
            section.totalDurationMinutes
          );
          return (
            <Card
              key={section.id}
              variant="bordered"
              className="overflow-hidden transition-all duration-150 hover:shadow-md border-gray-200 bg-white/90 backdrop-blur-sm"
            >
              <button
                className="w-full flex flex-col gap-3 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-start gap-4 flex-1">
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-md flex items-center justify-center flex-shrink-0 border border-blue-200">
                    <span className="text-blue-700 font-semibold text-xs">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-gray-900 text-left">
                      {section.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {section.lessons?.length ?? section.lessonCount ?? 0} lessons
                      </span>
                      {durationLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          {durationLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="sm:ml-4">
                  {isEnrolled ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                      <CheckCircle className="w-5 h-5" />
                      Enrolled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
                      <Lock className="w-5 h-5" />
                      Locked
                    </span>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="border-t bg-gradient-to-b from-gray-50 to-white">
                  {(section.lessons || []).map((lesson) => {
                    const duration = formatSecondsToLabel(lesson.videoDuration);
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-2.5 pl-12 border-b last:border-b-0 border-gray-200"
                      >
                        {lesson.contentType === "VIDEO" ? (
                          <Play className="w-4 h-4 text-gray-500" />
                        ) : (
                          <FileText className="w-4 h-4 text-gray-500" />
                        )}
                        <div className="flex-1">
                          <p className="text-gray-900">{lesson.title}</p>
                          {duration && (
                            <p className="text-sm text-gray-500">{duration}</p>
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
                    <div className="px-4 py-3 pl-12 text-sm text-gray-500">
                      Lessons coming soon
                    </div>
                  )}
                </div>
              )}
            </Card>
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

