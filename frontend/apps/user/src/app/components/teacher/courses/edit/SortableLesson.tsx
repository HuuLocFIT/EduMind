import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LessonResponse } from "@edumind/shared-types";
import { Edit, Trash2, GripVertical, Play, FileText, Video, FileQuestion, Sparkles } from "lucide-react";

interface SortableLessonProps {
  lesson: LessonResponse;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateQuiz?: () => void;
  disabled?: boolean;
}

export const SortableLesson: React.FC<SortableLessonProps> = ({
  lesson,
  onEdit,
  onDelete,
  onGenerateQuiz,
  disabled,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `lesson-${lesson.id}`,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getLessonIcon = () => {
    switch (lesson.contentType) {
      case "VIDEO":
        return <Video className="w-4 h-4 text-blue-500" />;
      case "ARTICLE":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "QUIZ":
        return <FileQuestion className="w-4 h-4 text-purple-500" />;
      default:
        return <Play className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors ${
        isDragging ? "shadow-lg ring-2 ring-green-500" : ""
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab hover:bg-gray-200 rounded active:cursor-grabbing touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </button>

      {getLessonIcon()}

      <div className="flex-1 min-w-0">
        <p className="text-gray-900 truncate">{lesson.title}</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{lesson.contentType}</span>
          {lesson.videoDuration && lesson.videoDuration > 0 && (
            <span>
              • {Math.floor(lesson.videoDuration / 60)}:
              {String(lesson.videoDuration % 60).padStart(2, "0")}
            </span>
          )}
          {lesson.isPreview && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Preview</span>
          )}
          {!lesson.isMandatory && (
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">Optional</span>
          )}
        </div>
      </div>

      {(lesson.contentType === "ARTICLE" || (lesson.contentType === "VIDEO" && lesson.articleContent)) && onGenerateQuiz && (
        <button
          onClick={onGenerateQuiz}
          className="p-1.5 hover:bg-purple-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="Generate AI Quiz"
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
        </button>
      )}
      <button
        onClick={onEdit}
        className="p-1.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Edit Lesson"
      >
        <Edit className="w-4 h-4 text-gray-500" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete Lesson"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
};

