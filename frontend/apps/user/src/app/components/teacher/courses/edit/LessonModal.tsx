import React from "react";
import { FileText, Wand2 } from "lucide-react";

const stripHtml = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};
import { ContentType } from "@edumind/shared-constants";
import type { LessonResponse } from "@edumind/shared-types";
import { Modal, Button, Input, Textarea } from "@edumind/user-ui";
import { RichTextEditor } from "../../../ui/RichTextEditor";

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
  lessonId?: number | null;
  onAutoTranscribeClick?: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  lessonForm,
  setLessonForm,
  editingLesson,
  onSave,
  saving,
  lessonId,
  onAutoTranscribeClick,
}) => {
  const isArticle = lessonForm.contentType === ContentType.ARTICLE;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLesson?.lesson ? "Edit Lesson" : "Add Lesson"}
      size="3xl"
    >
      <div className="space-y-4">
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Video Summary / Transcript{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (optional — used for quiz generation)
                  </span>
                </label>
                {onAutoTranscribeClick && lessonId ? (
                  <button
                    type="button"
                    onClick={onAutoTranscribeClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                      bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <Wand2 className="w-3 h-3" />
                    Auto-Transcribe
                  </button>
                ) : onAutoTranscribeClick && !lessonId ? (
                  <span className="text-xs text-gray-400 italic">
                    Save lesson first to transcribe
                  </span>
                ) : null}
              </div>
              <Textarea
                value={stripHtml(lessonForm.articleContent ?? "")}
                onChange={(e) => setLessonForm((p) => ({ ...p, articleContent: e.target.value }))}
                rows={8}
                placeholder="Paste a transcript or write a summary of the video content. This is used by the AI to generate quiz questions."
              />
            </div>
          </>
        )}

        {isArticle && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-800">Article Content</span>
              <span className="text-xs text-gray-400 ml-1">
                Use the toolbar to format text, add headings and lists.
              </span>
            </div>
            <div className="rounded-lg border border-gray-300 shadow-sm overflow-clip">
              <RichTextEditor
                value={lessonForm.articleContent ?? ""}
                onChange={(html) =>
                  setLessonForm((p) => ({
                    ...p,
                    articleContent: html,
                  }))
                }
                placeholder="Start writing your article..."
                rows={14}
                borderless
              />
            </div>
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

