import React, { useState } from "react";
import type { SectionDetailResponse } from "@edumind/shared-types";
import { Button } from "@edumind/user-ui";
import { BookOpen, Edit, Play, FileText, ChevronDown, ChevronRight } from "lucide-react";

interface CurriculumTabProps {
  courseId: number;
  sections: SectionDetailResponse[];
  onEdit: () => void;
}

export const CurriculumTab: React.FC<CurriculumTabProps> = ({
  courseId,
  sections,
  onEdit,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((s) => s.id))
  );

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No curriculum yet
        </h3>
        <p className="text-gray-600 mb-4">
          Start building your course content
        </p>
        <Button
          variant="primary"
          onClick={onEdit}
          className="bg-green-600 hover:bg-green-700"
        >
          Add Content
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {sections.length} sections •{" "}
          {sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0)} lessons
        </p>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Curriculum
        </Button>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="bg-white rounded-lg border overflow-hidden">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <div className="text-left">
                <h4 className="font-medium text-gray-900">{section.title}</h4>
                <p className="text-sm text-gray-500">
                  {section.lessons?.length || 0} lessons
                </p>
              </div>
            </div>
          </button>

          {expandedSections.has(section.id) && section.lessons && (
            <div className="border-t divide-y">
              {section.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 px-4 py-3 pl-12"
                >
                  {lesson.contentType === "VIDEO" ? (
                    <Play className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-gray-900">{lesson.title}</p>
                    {lesson.videoDuration && (
                      <p className="text-sm text-gray-500">
                        {Math.floor(lesson.videoDuration / 60)}:
                        {String(lesson.videoDuration % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  {lesson.isPreview && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Preview
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

