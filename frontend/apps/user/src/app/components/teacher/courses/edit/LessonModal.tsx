import React, { useState, useEffect, useRef } from "react";
import { FileText, Wand2, X as XIcon } from "lucide-react";

const stripHtml = (html: string) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

import { ContentType } from "@edumind/shared-constants";
import type { LessonResponse, LessonResource } from "@edumind/shared-types";
import { formatFileSize } from "@edumind/shared-utils";
import { Modal, Button, Input, Textarea, FileUpload, useToast, type UploadedFile } from "@edumind/user-ui";
import { RichTextEditor } from "../../../ui/RichTextEditor";
import { highlightArticleCodeBlocks } from "../../../ui/article-code-highlight";
import { VideoDropZone } from "./VideoDropZone";
import { fileUploadService } from "../../../../services/file-upload.service";
import { teacherCourseService } from "../../../../services/teacher-course.service";

export type LessonFormData = {
  title: string;
  description: string;
  contentType: string;
  videoUrl: string;
  videoDuration: number;
  articleContent: string;
  isPreview: boolean;
  isMandatory: boolean;
  resources: LessonResource[];
};

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  editingLesson: { sectionId: number; lesson?: LessonResponse } | null;
  onSave: (formData: LessonFormData) => void;
  saving: boolean;
  lessonId?: number | null;
  onAutoTranscribeClick?: () => void;
  onVideoChange?: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  courseId,
  editingLesson,
  onSave,
  saving,
  lessonId,
  onAutoTranscribeClick,
  onVideoChange,
}) => {
  const titleInputId = React.useId();
  const contentTypeId = React.useId();
  const transcriptInputId = React.useId();
  const descriptionInputId = React.useId();
  const previewInputId = React.useId();
  const mandatoryInputId = React.useId();
  const { error: showError } = useToast();
  const [form, setForm] = useState<LessonFormData>({
    title: "",
    description: "",
    contentType: ContentType.VIDEO as string,
    videoUrl: "",
    videoDuration: 0,
    articleContent: "",
    isPreview: false,
    isMandatory: true,
    resources: [],
  });
  const [uploadingResources, setUploadingResources] = useState(false);
  const [highlighting, setHighlighting] = useState(false);
  const processedResourceFilesRef = useRef<Set<File>>(new Set());

  // Initialize form when modal opens or lesson changes
  useEffect(() => {
    if (!isOpen) return;
    const lesson = editingLesson?.lesson;
    processedResourceFilesRef.current = new Set();
    setForm({
      title: lesson?.title ?? "",
      description: lesson?.description ?? "",
      contentType: lesson?.contentType ?? ContentType.VIDEO,
      videoUrl: lesson?.videoUrl ?? "",
      videoDuration: lesson?.videoDuration ?? 0,
      articleContent: lesson?.articleContent ?? "",
      isPreview: lesson?.isPreview ?? false,
      isMandatory: lesson?.isMandatory ?? true,
      resources: lesson?.resources ?? [],
    });
  }, [isOpen, editingLesson?.lesson]);

  const handleResourceFilesChange = async (files: UploadedFile[]) => {
    // FileUpload reports the full cumulative selection on every change, so only
    // upload files we haven't already processed to avoid duplicate uploads.
    const newFiles = files.filter(
      (f) => f.status !== "error" && !processedResourceFilesRef.current.has(f.file)
    );
    if (newFiles.length === 0) return;

    newFiles.forEach((f) => processedResourceFilesRef.current.add(f.file));

    setUploadingResources(true);
    try {
      for (const item of newFiles) {
        try {
          const result = await fileUploadService.uploadFile(item.file, "lessons/resources");
          const extension = item.file.name.split(".").pop() ?? "";
          const type = (result.fileType || extension).toUpperCase();
          const resource: LessonResource = {
            title: item.file.name,
            url: result.url,
            type,
            size: result.size,
          };
          // Merge each successful upload immediately so a later failure in the
          // same batch never discards already-uploaded files.
          setForm((p) => ({ ...p, resources: [...p.resources, resource] }));
        } catch (err: any) {
          processedResourceFilesRef.current.delete(item.file);
          showError(err.message || `Failed to upload ${item.file.name}`);
        }
      }
    } finally {
      setUploadingResources(false);
    }
  };

  // Code blocks are syntax-highlighted once, here, so the student bundle never
  // has to ship a highlighter and lesson code is coloured on first paint.
  // A highlighter failure must not cost the teacher their edit, so the plain
  // content is saved instead.
  const handleSave = async () => {
    if (highlighting) return;
    if (!form.articleContent) {
      onSave(form);
      return;
    }
    setHighlighting(true);
    try {
      const articleContent = await highlightArticleCodeBlocks(form.articleContent);
      onSave({ ...form, articleContent });
    } catch {
      onSave(form);
    } finally {
      setHighlighting(false);
    }
  };

  const handleRemoveResource = (url: string) => {
    setForm((p) => ({ ...p, resources: p.resources.filter((r) => r.url !== url) }));
    teacherCourseService.deleteLessonResource(courseId, url).catch((err: any) => {
      showError(err.message || "Failed to delete resource file");
    });
  };

  // Sync videoUrl/videoDuration when upload completes (parent refreshes editingLesson.lesson)
  useEffect(() => {
    if (!editingLesson?.lesson) return;
    setForm((prev) => ({
      ...prev,
      videoUrl: editingLesson.lesson!.videoUrl ?? "",
      videoDuration: editingLesson.lesson!.videoDuration ?? 0,
    }));
  }, [editingLesson?.lesson?.videoUrl, editingLesson?.lesson?.videoDuration]);

  const isArticle = form.contentType === ContentType.ARTICLE;
  const isQuiz = form.contentType === ContentType.QUIZ;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLesson?.lesson ? "Edit Lesson" : "Add Lesson"}
      size="3xl"
    >
      <div className="space-y-4 px-0.5">
        <div>
          <label htmlFor={titleInputId} className="block text-sm font-medium text-gray-700 mb-1">
            Lesson Title <span className="text-red-500">*</span>
          </label>
          <Input
            id={titleInputId}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g., Setting up your development environment"
          />
        </div>

        <div>
          <label htmlFor={contentTypeId} className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
          <select
            id={contentTypeId}
            value={form.contentType}
            onChange={(e) => setForm((p) => ({ ...p, contentType: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value={ContentType.VIDEO}>Video</option>
            <option value={ContentType.ARTICLE}>Article</option>
            <option value={ContentType.QUIZ}>Quiz</option>
          </select>
        </div>

        {isQuiz && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
            <p className="font-medium mb-1">Quiz lesson</p>
            <p className="text-xs text-purple-700">
              After saving, use "Generate Quiz" to create questions from one or more lessons in this course.
              Students will take the quiz directly on this lesson page.
            </p>
          </div>
        )}

        {form.contentType === ContentType.VIDEO && !isQuiz && (
          <>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Video</p>
              <VideoDropZone
                lessonId={lessonId ?? null}
                lessonTitle={form.title || 'Untitled Lesson'}
                currentVideoUrl={form.videoUrl || null}
                currentUploadStatus={editingLesson?.lesson?.videoUploadStatus ?? 'NONE'}
                onVideoReady={onVideoChange}
                onVideoRemoved={onVideoChange}
              />
            </div>
            {form.videoUrl ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                Video linked to this lesson. You can continue editing metadata or close this modal.
              </div>
            ) : null}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor={transcriptInputId} className="block text-sm font-medium text-gray-700">
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
                id={transcriptInputId}
                value={stripHtml(form.articleContent ?? "")}
                onChange={(e) => setForm((p) => ({ ...p, articleContent: e.target.value }))}
                rows={8}
                placeholder="Paste a transcript or write a summary of the video content. This is used by the AI to generate quiz questions."
              />
            </div>
          </>
        )}

        {isArticle && !isQuiz && (
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
                value={form.articleContent ?? ""}
                onChange={(html) =>
                  setForm((p) => ({
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
          <label htmlFor={descriptionInputId} className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <Textarea
            id={descriptionInputId}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={2}
            placeholder="Brief description of what students will learn"
          />
        </div>

        <div>
          <FileUpload
            accept=".pdf,.docx,.pptx,.xlsx,.zip"
            multiple
            maxSize={10}
            maxFiles={5}
            hideFileList
            label="Attach Resources"
            helperText={
              uploadingResources
                ? "Uploading..."
                : "PDF, DOCX, PPTX, XLSX, or ZIP — max 10MB each, up to 5 files"
            }
            onFilesChange={handleResourceFilesChange}
          />
          {form.resources.length > 0 && (
            <div className="mt-3 space-y-2">
              {form.resources.map((resource) => (
                <div
                  key={resource.url}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{resource.title}</p>
                      <p className="text-xs text-gray-500">
                        {resource.type}
                        {typeof resource.size === "number" ? ` · ${formatFileSize(resource.size)}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${resource.title}`}
                    onClick={() => handleRemoveResource(resource.url)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                  >
                    <XIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
          <label aria-label="Free Preview" htmlFor={previewInputId} className="flex items-center gap-2 cursor-pointer">
            <input
              id={previewInputId}
              type="checkbox"
              checked={form.isPreview}
              onChange={(e) => setForm((p) => ({ ...p, isPreview: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span>
              <span className="text-sm font-medium text-gray-900">Free Preview</span>
              <span className="block text-xs text-gray-500">Allow non-enrolled users to view</span>
            </span>
          </label>

          <label aria-label="Mandatory" htmlFor={mandatoryInputId} className="flex items-center gap-2 cursor-pointer">
            <input
              id={mandatoryInputId}
              type="checkbox"
              checked={form.isMandatory}
              onChange={(e) => setForm((p) => ({ ...p, isMandatory: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span>
              <span className="text-sm font-medium text-gray-900">Mandatory</span>
              <span className="block text-xs text-gray-500">Required for course completion</span>
            </span>
          </label>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving || highlighting}
            className="bg-green-600 hover:bg-green-700"
          >
            {editingLesson?.lesson ? "Update Lesson" : "Create Lesson"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
