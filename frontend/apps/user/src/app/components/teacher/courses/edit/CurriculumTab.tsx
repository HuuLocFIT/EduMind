import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ContentType } from "@edumind/shared-constants";
import { teacherCourseService } from '../../../../services/teacher-course.service';
import type {
  SectionDetailResponse,
  CreateLessonRequest,
  LessonResponse,
} from "@edumind/shared-types";
import { Button, useModal, useToast, ConfirmDialog } from "@edumind/user-ui";
import { Plus, BookOpen, GripVertical } from "lucide-react";
import { SortableSection } from "./SortableSection";
import { LessonModal } from "./LessonModal";
import { SectionModal } from "./SectionModal";
import { QuizGeneratorModal } from "./QuizGeneratorModal";
import { TranscriptionModal } from "./TranscriptionModal";

interface CurriculumTabProps {
  courseId: number;
  sections: SectionDetailResponse[];
  onRefresh: () => void;
}

export const CurriculumTab: React.FC<CurriculumTabProps> = ({
  courseId,
  sections,
  onRefresh,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const sectionModal = useModal();
  const lessonModal = useModal();
  const quizModal = useModal();
  const transcribeModal = useModal();

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((s) => s.id))
  );
  const seenSectionIds = useRef(new Set(sections.map((s) => s.id)));
  const pendingScrollTo = useRef<number | null>(null);

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      let changed = false;
      sections.forEach((s) => {
        if (!seenSectionIds.current.has(s.id)) {
          seenSectionIds.current.add(s.id);
          next.add(s.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [sections]);

  useEffect(() => {
    if (pendingScrollTo.current === null) return;
    const id = pendingScrollTo.current;
    pendingScrollTo.current = null;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-section-id="${id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [sections]);
  const [editingSection, setEditingSection] = useState<SectionDetailResponse | null>(null);
  const [editingLesson, setEditingLesson] = useState<{
    sectionId: number;
    lesson?: LessonResponse;
  } | null>(null);
  const [quizTargetLesson, setQuizTargetLesson] = useState<LessonResponse | null>(null);
  const [transcribeTargetLesson, setTranscribeTargetLesson] = useState<LessonResponse | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [refreshingLessonId, setRefreshingLessonId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<UniqueIdentifier | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);
  const deleteSectionConfirm = useModal();
  const deleteLessonConfirm = useModal();

  // Section form
  const [sectionForm, setSectionForm] = useState({ title: "", description: "" });

  // Lesson form
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    contentType: ContentType.VIDEO as string,
    videoUrl: "",
    videoDuration: 0,
    articleContent: "",
    isPreview: false,
    isMandatory: true,
  });

  // DnD Sensors for sections
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sectionIds = useMemo(() => sections.map((s) => `section-${s.id}`), [sections]);

  // ==================== SECTION DRAG HANDLERS ====================

  const handleSectionDragStart = (event: DragStartEvent) => {
    setActiveSectionId(event.active.id);
  };

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    setActiveSectionId(null);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => `section-${s.id}` === active.id);
    const newIndex = sections.findIndex((s) => `section-${s.id}` === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sections, oldIndex, newIndex);
    const sectionIdList = newOrder.map((s) => s.id);

    try {
      setReordering(true);
      await teacherCourseService.reorderSections(courseId, { sectionIds: sectionIdList });
      showSuccess("Sections reordered");
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to reorder sections");
    } finally {
      setReordering(false);
    }
  };

  // ==================== SECTION HANDLERS ====================

  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({ title: "", description: "" });
    sectionModal.open();
  };

  const openEditSection = (section: SectionDetailResponse) => {
    setEditingSection(section);
    setSectionForm({ title: section.title, description: section.description || "" });
    sectionModal.open();
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title.trim()) {
      showError("Section title is required");
      return;
    }

    try {
      setSaving(true);
      if (editingSection) {
        await teacherCourseService.updateSection(editingSection.id, sectionForm);
        showSuccess("Section updated");
      } else {
        const created = await teacherCourseService.createSection(courseId, sectionForm);
        pendingScrollTo.current = created.id;
        showSuccess("Section created");
      }
      sectionModal.close();
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = (sectionId: number) => {
    setDeletingSectionId(sectionId);
    deleteSectionConfirm.open();
  };

  const confirmDeleteSection = async () => {
    if (!deletingSectionId) return;
    try {
      await teacherCourseService.deleteSection(deletingSectionId);
      showSuccess("Section deleted");
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to delete section");
    } finally {
      deleteSectionConfirm.close();
      setDeletingSectionId(null);
    }
  };

  // ==================== LESSON HANDLERS ====================

  const openAddLesson = (sectionId: number) => {
    setEditingLesson({ sectionId });
    setLessonForm({
      title: "",
      description: "",
      contentType: ContentType.VIDEO,
      videoUrl: "",
      videoDuration: 0,
      articleContent: "",
      isPreview: false,
      isMandatory: true,
    });
    lessonModal.open();
  };

  const openEditLesson = (sectionId: number, lesson: LessonResponse) => {
    setEditingLesson({ sectionId, lesson });
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      contentType: lesson.contentType,
      videoUrl: lesson.videoUrl || "",
      videoDuration: lesson.videoDuration || 0,
      articleContent: lesson.articleContent || "",
      isPreview: lesson.isPreview,
      isMandatory: lesson.isMandatory,
    });
    lessonModal.open();
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim() || !editingLesson) {
      showError("Lesson title is required");
      return;
    }

    try {
      setSaving(true);
      const data: CreateLessonRequest = {
        title: lessonForm.title,
        description: lessonForm.description || undefined,
        contentType: lessonForm.contentType as any,
        articleContent: lessonForm.articleContent || undefined,
        isPreview: lessonForm.isPreview,
        isMandatory: lessonForm.isMandatory,
        // videoUrl and videoDuration are managed via the video upload flow, not lesson CRUD
      };

      if (editingLesson.lesson) {
        await teacherCourseService.updateLesson(editingLesson.lesson.id, data);
        showSuccess("Lesson updated");
      } else {
        await teacherCourseService.createLesson(editingLesson.sectionId, data);
        pendingScrollTo.current = editingLesson.sectionId;
        showSuccess("Lesson created");
      }
      lessonModal.close();
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = (lessonId: number) => {
    setDeletingLessonId(lessonId);
    deleteLessonConfirm.open();
  };

  const confirmDeleteLesson = async () => {
    if (!deletingLessonId) return;
    try {
      await teacherCourseService.deleteLesson(deletingLessonId);
      showSuccess("Lesson deleted");
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to delete lesson");
    } finally {
      deleteLessonConfirm.close();
      setDeletingLessonId(null);
    }
  };

  const handleReorderLessons = async (sectionId: number, lessonIds: number[]) => {
    try {
      setReordering(true);
      await teacherCourseService.reorderLessons(sectionId, { lessonIds });
      showSuccess("Lessons reordered");
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to reorder lessons");
    } finally {
      setReordering(false);
    }
  };

  const openQuizGenerator = (lesson: LessonResponse) => {
    setQuizTargetLesson(lesson);
    quizModal.open();
  };

  const handleAutoTranscribeClick = () => {
    if (editingLesson?.lesson) {
      setTranscribeTargetLesson(editingLesson.lesson);
      transcribeModal.open();
    }
  };

  const handleTranscriptionApplied = async () => {
    transcribeModal.close();
    lessonModal.close();
    await onRefresh();
    showSuccess("Transcript applied! Open the lesson editor to review it.");
  };

  const handleVideoUploadCompleted = async () => {
    if (!editingLesson?.lesson) {
      await onRefresh();
      showSuccess("Video uploaded successfully");
      return;
    }

    try {
      setRefreshingLessonId(editingLesson.lesson.id);
      const refreshedLesson = await teacherCourseService.getLessonDetail(editingLesson.lesson.id);

      setEditingLesson((prev) => {
        if (!prev || !prev.lesson || prev.lesson.id !== refreshedLesson.id) {
          return prev;
        }
        return {
          ...prev,
          lesson: refreshedLesson,
        };
      });

      setLessonForm((prev) => ({
        ...prev,
        videoUrl: refreshedLesson.videoUrl || '',
        videoDuration: refreshedLesson.videoDuration || 0,
      }));

      await onRefresh();
      showSuccess("Video uploaded successfully");
    } catch (err: any) {
      showError(err.message || "Video uploaded but failed to refresh lesson data");
      await onRefresh();
    } finally {
      setRefreshingLessonId(null);
    }
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Get active section for drag overlay
  const activeSection = activeSectionId
    ? sections.find((s) => `section-${s.id}` === activeSectionId)
    : null;

  const totalLessons = sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            {sections.length} section{sections.length !== 1 ? "s" : ""} • {totalLessons} lesson
            {totalLessons !== 1 ? "s" : ""}
          </p>
          <p className="text-sm text-gray-400">Drag sections or lessons to reorder</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={openAddSection}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sections yet</h3>
          <p className="text-gray-600 mb-4">Start by adding your first section</p>
          <Button
            variant="primary"
            onClick={openAddSection}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700"
          >
            Add Section
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleSectionDragStart}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  isExpanded={expandedSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  onEdit={() => openEditSection(section)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onAddLesson={() => openAddLesson(section.id)}
                  onEditLesson={(lesson) => openEditLesson(section.id, lesson)}
                  onDeleteLesson={handleDeleteLesson}
                  onReorderLessons={(lessonIds) => handleReorderLessons(section.id, lessonIds)}
                  onGenerateQuiz={openQuizGenerator}
                  reordering={reordering}
                />
              ))}
            </div>
          </SortableContext>

          <button
            onClick={openAddSection}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>

          {/* Drag Overlay for Section */}
          <DragOverlay>
            {activeSection && (
              <div className="bg-white border-2 border-green-500 rounded-lg shadow-2xl p-4 opacity-95">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900">{activeSection.title}</h4>
                    <p className="text-sm text-gray-500">{activeSection.lessons?.length || 0} lessons</p>
                  </div>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Section Modal */}
      <SectionModal
        isOpen={sectionModal.isOpen}
        onClose={sectionModal.close}
        sectionForm={sectionForm}
        setSectionForm={setSectionForm}
        editingSection={editingSection}
        onSave={handleSaveSection}
        saving={saving}
      />

      {/* Lesson Modal */}
      <LessonModal
        isOpen={lessonModal.isOpen}
        onClose={lessonModal.close}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        editingLesson={editingLesson}
        onSave={handleSaveLesson}
        saving={saving || refreshingLessonId !== null}
        lessonId={editingLesson?.lesson?.id ?? null}
        onAutoTranscribeClick={editingLesson?.lesson ? handleAutoTranscribeClick : undefined}
        onVideoChange={handleVideoUploadCompleted}
      />

      {/* Quiz Generator Modal */}
      <QuizGeneratorModal
        isOpen={quizModal.isOpen}
        onClose={quizModal.close}
        lesson={quizTargetLesson}
      />

      <TranscriptionModal
        isOpen={transcribeModal.isOpen}
        onClose={transcribeModal.close}
        lesson={transcribeTargetLesson}
        onTranscriptionApplied={handleTranscriptionApplied}
      />

      {/* Delete Section Confirm */}
      <ConfirmDialog
        isOpen={deleteSectionConfirm.isOpen}
        onClose={deleteSectionConfirm.close}
        onConfirm={confirmDeleteSection}
        title="Delete Section"
        message="Are you sure you want to delete this section and all its lessons? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete Lesson Confirm */}
      <ConfirmDialog
        isOpen={deleteLessonConfirm.isOpen}
        onClose={deleteLessonConfirm.close}
        onConfirm={confirmDeleteLesson}
        title="Delete Lesson"
        message="Are you sure you want to delete this lesson? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
