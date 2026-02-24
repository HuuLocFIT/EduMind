import React from "react";
import { ContentType } from "@edumind/shared-constants";
import type { LessonResponse } from "@edumind/shared-types";
import { Modal, Button, Input, Textarea } from "@edumind/user-ui";

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonForm: {
    title: string;
    description: string;
    contentType: string;
    videoUrl: string;
    videoDuration: number;
    articleContent: string;
    isPreview: boolean;
    isMandatory: boolean;
  };
  setLessonForm: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      contentType: string;
      videoUrl: string;
      videoDuration: number;
      articleContent: string;
      isPreview: boolean;
      isMandatory: boolean;
    }>
  >;
  editingLesson: { sectionId: number; lesson?: LessonResponse } | null;
  onSave: () => void;
  saving: boolean;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  lessonForm,
  setLessonForm,
  editingLesson,
  onSave,
  saving,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLesson?.lesson ? "Edit Lesson" : "Add Lesson"}
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lesson Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={lessonForm.title}
            onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g., Setting up your development environment"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
          <select
            value={lessonForm.contentType}
            onChange={(e) => setLessonForm((p) => ({ ...p, contentType: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={ContentType.VIDEO}>Video</option>
            <option value={ContentType.ARTICLE}>Article</option>
          </select>
        </div>

        {lessonForm.contentType === ContentType.VIDEO && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
                <Input
                  value={lessonForm.videoUrl}
                  onChange={(e) => setLessonForm((p) => ({ ...p, videoUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={lessonForm.videoDuration || ""}
                  onChange={(e) =>
                    setLessonForm((p) => ({ ...p, videoDuration: Number(e.target.value) || 0 }))
                  }
                  placeholder="e.g., 600 (10 minutes)"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Summary / Transcript{" "}
                <span className="text-xs text-gray-400 font-normal">(optional — used for quiz generation)</span>
              </label>
              <Textarea
                value={lessonForm.articleContent}
                onChange={(e) => setLessonForm((p) => ({ ...p, articleContent: e.target.value }))}
                rows={6}
                placeholder="Paste a transcript or write a summary of the video content. This is used by the AI to generate quiz questions."
              />
            </div>
          </>
        )}

        {lessonForm.contentType === ContentType.ARTICLE && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article Content</label>
            <Textarea
              value={lessonForm.articleContent}
              onChange={(e) => setLessonForm((p) => ({ ...p, articleContent: e.target.value }))}
              rows={10}
              placeholder="Write your article content here..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <Textarea
            value={lessonForm.description}
            onChange={(e) => setLessonForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Brief description of what students will learn"
          />
        </div>

        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lessonForm.isPreview}
              onChange={(e) => setLessonForm((p) => ({ ...p, isPreview: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Free Preview</span>
              <p className="text-xs text-gray-500">Allow non-enrolled users to view</p>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lessonForm.isMandatory}
              onChange={(e) => setLessonForm((p) => ({ ...p, isMandatory: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Mandatory</span>
              <p className="text-xs text-gray-500">Required for course completion</p>
            </div>
          </label>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            isLoading={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {editingLesson?.lesson ? "Update Lesson" : "Create Lesson"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

