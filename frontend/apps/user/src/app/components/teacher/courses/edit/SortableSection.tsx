import React, { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SectionDetailResponse, LessonResponse } from "@edumind/shared-types";
import { Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { SortableLesson } from "./SortableLesson";

interface SortableSectionProps {
  section: SectionDetailResponse;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: LessonResponse) => void;
  onDeleteLesson: (lessonId: number) => void;
  onReorderLessons: (lessonIds: number[]) => void;
  onGenerateQuiz?: (lesson: LessonResponse) => void;
  reordering: boolean;
}

export const SortableSection: React.FC<SortableSectionProps> = ({
  section,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderLessons,
  onGenerateQuiz,
  reordering,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Nested DnD for lessons
  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const lessonIds = useMemo(
    () => section.lessons?.map((l) => `lesson-${l.id}`) || [],
    [section.lessons]
  );

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !section.lessons) return;

    const oldIndex = section.lessons.findIndex((l) => `lesson-${l.id}` === active.id);
    const newIndex = section.lessons.findIndex((l) => `lesson-${l.id}` === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(section.lessons, oldIndex, newIndex);
      onReorderLessons(newOrder.map((l) => l.id));
    }
  };

  const totalDuration = section.lessons?.reduce((acc, lesson) => acc + (lesson.videoDuration ?? 0), 0) || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border ${isDragging ? "shadow-xl ring-2 ring-green-500" : ""}`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab hover:bg-gray-200 rounded active:cursor-grabbing touch-none"
          title="Drag to reorder section"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>

        <button onClick={onToggle} className="flex-1 flex items-center gap-2 text-left">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          <div>
            <h4 className="font-medium text-gray-900">{section.title}</h4>
            <p className="text-sm text-gray-500">
              {section.lessons?.length || 0} lessons
              {totalDuration > 0 && (
                <span className="ml-2">
                  • {Math.floor(totalDuration / 60)}m {totalDuration % 60}s
                </span>
              )}
            </p>
          </div>
        </button>

        <button onClick={onEdit} className="p-2 hover:bg-gray-200 rounded-lg" title="Edit Section">
          <Edit className="w-4 h-4 text-gray-500" />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-red-100 rounded-lg" title="Delete Section">
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>

      {/* Lessons with nested DnD */}
      {isExpanded && (
        <div className="p-4 space-y-2">
          <DndContext
            sensors={lessonSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleLessonDragEnd}
          >
            <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
              {section.lessons?.map((lesson) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  onEdit={() => onEditLesson(lesson)}
                  onDelete={() => onDeleteLesson(lesson.id)}
                  onGenerateQuiz={onGenerateQuiz ? () => onGenerateQuiz(lesson) : undefined}
                  disabled={reordering}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={onAddLesson}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lesson
          </button>
        </div>
      )}
    </div>
  );
};

