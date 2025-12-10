import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { teacherCourseService } from "../../services/teacher-course.service";
import { categoryService } from "../../services/category.service";
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseLevel, CourseStatus, ContentType } from "@edumind/shared-constants";
import type {
  CourseDetailResponse,
  UpdateCourseRequest,
  CategoryResponse,
  SectionDetailResponse,
  CreateSectionRequest,
  UpdateSectionRequest,
  CreateLessonRequest,
  UpdateLessonRequest,
  LessonResponse,
} from "@edumind/shared-types";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Alert,
  Modal,
  useModal,
  useToast,
  Skeleton,
} from "@edumind/user-ui";
import { CourseStatusBadge } from "../../components/teacher/courses/CourseStatusBadge";
import {
  ArrowLeft,
  Save,
  BookOpen,
  Image,
  DollarSign,
  Settings,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Play,
  FileText,
  ChevronDown,
  ChevronRight,
  Video,
  FileQuestion,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type TabId = "basic" | "curriculum" | "pricing" | "settings";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "basic", label: "Basic Info", icon: <BookOpen className="w-4 h-4" /> },
  { id: "curriculum", label: "Curriculum", icon: <FileText className="w-4 h-4" /> },
  { id: "pricing", label: "Pricing", icon: <DollarSign className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

// ============================================================================
// BASIC INFO TAB (unchanged)
// ============================================================================

interface BasicInfoTabProps {
  course: CourseDetailResponse;
  categories: CategoryResponse[];
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  course,
  categories,
  onSave,
  saving,
}) => {
  const [formData, setFormData] = useState({
    title: course.title,
    slug: course.slug,
    description: course.description,
    shortDescription: course.shortDescription || "",
    level: course.level,
    language: course.language,
    thumbnailUrl: course.thumbnailUrl || "",
    previewVideoUrl: course.previewVideoUrl || "",
    durationHours: course.durationHours || 0,
  });

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Title
            </label>
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Course title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug
            </label>
            <Input
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              placeholder="course-url-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Description
            </label>
            <Textarea
              value={formData.shortDescription}
              onChange={(e) => handleChange("shortDescription", e.target.value)}
              placeholder="Brief overview (max 500 characters)"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.shortDescription.length}/500 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Detailed description"
              rows={8}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              value={formData.level}
              onChange={(e) => handleChange("level", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={CourseLevel.BEGINNER}>Beginner</option>
              <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
              <option value={CourseLevel.ADVANCED}>Advanced</option>
              <option value={CourseLevel.ALL_LEVELS}>All Levels</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleChange("language", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="en">English</option>
              <option value="vi">Vietnamese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (hours)
            </label>
            <Input
              type="number"
              min={0}
              value={formData.durationHours}
              onChange={(e) => handleChange("durationHours", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail URL
            </label>
            <Input
              value={formData.thumbnailUrl}
              onChange={(e) => handleChange("thumbnailUrl", e.target.value)}
              placeholder="https://..."
            />
            {formData.thumbnailUrl && (
              <img
                src={formData.thumbnailUrl}
                alt="Thumbnail preview"
                className="mt-2 w-full aspect-video object-cover rounded-lg"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preview Video URL
            </label>
            <Input
              value={formData.previewVideoUrl}
              onChange={(e) => handleChange("previewVideoUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// PRICING TAB (unchanged)
// ============================================================================

interface PricingTabProps {
  course: CourseDetailResponse;
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

const PricingTab: React.FC<PricingTabProps> = ({ course, onSave, saving }) => {
  const [formData, setFormData] = useState({
    price: course.price,
    discountPrice: course.discountPrice || null,
    currency: course.currency || "USD",
  });
  const [isFree, setIsFree] = useState(course.price === 0);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFreeToggle = (checked: boolean) => {
    setIsFree(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, price: 0, discountPrice: null }));
    }
  };

  const handleSave = () => {
    onSave({
      price: isFree ? 0 : formData.price,
      discountPrice: isFree ? undefined : formData.discountPrice || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Free Course</p>
          <p className="text-sm text-gray-600">Make this course available for free</p>
        </div>
        <Switch checked={isFree} onChange={(e) => handleFreeToggle(e.target.checked)} />
      </div>

      {!isFree && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="VND">VND (₫)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price</label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formData.price}
              onChange={(e) => handleChange("price", Number(e.target.value))}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Price (optional)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formData.discountPrice || ""}
              onChange={(e) =>
                handleChange("discountPrice", e.target.value ? Number(e.target.value) : null)
              }
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="Leave empty for no discount"
            />
          </div>

          {formData.price > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Price Preview:</p>
              <div className="flex items-center gap-3">
                {formData.discountPrice && formData.discountPrice < formData.price ? (
                  <>
                    <span className="text-gray-400 line-through text-lg">
                      {formData.currency} {formData.price.toFixed(2)}
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {formData.currency} {formData.discountPrice.toFixed(2)}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-sm rounded">
                      {Math.round(((formData.price - formData.discountPrice) / formData.price) * 100)}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-gray-900">
                    {formData.currency} {formData.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {isFree && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">FREE</p>
          <p className="text-sm text-gray-600">This course will be available at no cost</p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// SETTINGS TAB (unchanged)
// ============================================================================

interface SettingsTabProps {
  course: CourseDetailResponse;
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ course, onSave, saving }) => {
  const [formData, setFormData] = useState({
    hasCertificate: course.hasCertificate,
    hasSubtitles: course.hasSubtitles,
    metaTitle: course.metaTitle || "",
    metaDescription: course.metaDescription || "",
    metaKeywords: course.metaKeywords || "",
  });

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Course Features</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Certificate of Completion</p>
              <p className="text-sm text-gray-600">Award a certificate when students complete the course</p>
            </div>
            <Switch
              checked={formData.hasCertificate}
              onChange={(checked) => handleChange("hasCertificate", checked)}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Subtitles/Captions</p>
              <p className="text-sm text-gray-600">Course videos include subtitles or captions</p>
            </div>
            <Switch
              checked={formData.hasSubtitles}
              onChange={(checked) => handleChange("hasSubtitles", checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
            <Input
              value={formData.metaTitle}
              onChange={(e) => handleChange("metaTitle", e.target.value)}
              placeholder="SEO title for search engines"
              helperText="Recommended: 50-60 characters"
            />
            <p className="text-xs text-gray-500 mt-1">{formData.metaTitle.length}/60 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
            <Textarea
              value={formData.metaDescription}
              onChange={(e) => handleChange("metaDescription", e.target.value)}
              placeholder="SEO description for search engines"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.metaDescription.length}/160 characters (recommended)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
            <Input
              value={formData.metaKeywords}
              onChange={(e) => handleChange("metaKeywords", e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              helperText="Comma-separated keywords"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Search Preview</h3>
        <div className="p-4 border rounded-lg bg-white">
          <p className="text-blue-600 text-lg hover:underline cursor-pointer">
            {formData.metaTitle || course.title}
          </p>
          <p className="text-green-700 text-sm">www.edumind.com/courses/{course.slug}</p>
          <p className="text-gray-600 text-sm mt-1">
            {formData.metaDescription || course.shortDescription || course.description?.substring(0, 160)}
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// SORTABLE LESSON COMPONENT
// ============================================================================

interface SortableLessonProps {
  lesson: LessonResponse;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

const SortableLesson: React.FC<SortableLessonProps> = ({ lesson, onEdit, onDelete, disabled }) => {
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
              • {Math.floor(lesson.videoDuration / 60)}:{String(lesson.videoDuration % 60).padStart(2, "0")}
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

// ============================================================================
// SORTABLE SECTION COMPONENT
// ============================================================================

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
  reordering: boolean;
}

const SortableSection: React.FC<SortableSectionProps> = ({
  section,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderLessons,
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
              {section.lessons?.reduce((acc, lesson) => acc + (lesson.videoDuration ?? 0), 0) && section.lessons?.reduce((acc, lesson) => acc + (lesson.videoDuration ?? 0), 0) > 0 && (
                <span className="ml-2">
                  • {Math.floor(section.lessons?.reduce((acc, lesson) => acc + (lesson.videoDuration ?? 0), 0) / 60)}m {section.lessons?.reduce((acc, lesson) => acc + (lesson.videoDuration ?? 0), 0) % 60}s
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

// ============================================================================
// CURRICULUM TAB (with Drag & Drop)
// ============================================================================

interface CurriculumTabProps {
  courseId: number;
  sections: SectionDetailResponse[];
  onRefresh: () => void;
}

const CurriculumTab: React.FC<CurriculumTabProps> = ({ courseId, sections, onRefresh }) => {
  const { success: showSuccess, error: showError } = useToast();
  const sectionModal = useModal();
  const lessonModal = useModal();

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((s) => s.id))
  );
  const [editingSection, setEditingSection] = useState<SectionDetailResponse | null>(null);
  const [editingLesson, setEditingLesson] = useState<{
    sectionId: number;
    lesson?: LessonResponse;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<UniqueIdentifier | null>(null);

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
        await teacherCourseService.createSection(courseId, sectionForm);
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

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm("Delete this section and all its lessons?")) return;

    try {
      await teacherCourseService.deleteSection(sectionId);
      showSuccess("Section deleted");
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to delete section");
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
        ...lessonForm,
        contentType: lessonForm.contentType as any,
        videoDuration: lessonForm.videoDuration || undefined,
        videoUrl: lessonForm.videoUrl || undefined,
        articleContent: lessonForm.articleContent || undefined,
      };

      if (editingLesson.lesson) {
        await teacherCourseService.updateLesson(editingLesson.lesson.id, data);
        showSuccess("Lesson updated");
      } else {
        await teacherCourseService.createLesson(editingLesson.sectionId, data);
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

  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm("Delete this lesson?")) return;

    try {
      await teacherCourseService.deleteLesson(lessonId);
      showSuccess("Lesson deleted");
      onRefresh();
    } catch (err: any) {
      showError(err.message || "Failed to delete lesson");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600">
            {sections.length} section{sections.length !== 1 ? "s" : ""} •{" "}
            {sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0)} lesson
            {sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) !== 1 ? "s" : ""}
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
                  reordering={reordering}
                />
              ))}
            </div>
          </SortableContext>

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
      <Modal
        isOpen={sectionModal.isOpen}
        onClose={sectionModal.close}
        title={editingSection ? "Edit Section" : "Add Section"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={sectionForm.title}
              onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Introduction to React"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <Textarea
              value={sectionForm.description}
              onChange={(e) => setSectionForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              placeholder="Brief description of this section"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="secondary" onClick={sectionModal.close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSection}
              isLoading={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {editingSection ? "Update Section" : "Create Section"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lesson Modal */}
      <Modal
        isOpen={lessonModal.isOpen}
        onClose={lessonModal.close}
        title={editingLesson?.lesson ? "Edit Lesson" : "Add Lesson"}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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
            <Button variant="secondary" onClick={lessonModal.close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveLesson}
              isLoading={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {editingLesson?.lesson ? "Update Lesson" : "Create Lesson"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TeacherCourseEditPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [sections, setSections] = useState<SectionDetailResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeTab = (searchParams.get("tab") as TabId) || "basic";

  const fetchData = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      const [courseData, sectionsData, categoriesData] = await Promise.all([
        teacherCourseService.getCourseDetail(Number(courseId)),
        teacherCourseService.getCourseSectionsWithLessons(Number(courseId)),
        categoryService.getActiveCategories(),
      ]);
      setCourse(courseData);
      setSections(sectionsData);
      setCategories(categoriesData);
    } catch (err: any) {
      showError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [courseId, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (data: Partial<UpdateCourseRequest>) => {
    if (!course) return;

    try {
      setSaving(true);
      const updated = await teacherCourseService.updateCourse(course.id, data);
      setCourse((prev) => (prev ? { ...prev, ...updated } : prev));
      showSuccess("Course updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!course) {
    return <Alert variant="error" title="Error" message="Course not found" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(TeacherRouteHelpers.courseDetail(course.id))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
            <CourseStatusBadge status={course.status} />
          </div>
          <p className="text-gray-600 mt-1 truncate max-w-xl">{course.title}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b px-4">
          <div className="flex gap-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-green-600 text-green-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === "basic" && (
            <BasicInfoTab course={course} categories={categories} onSave={handleSave} saving={saving} />
          )}
          {activeTab === "curriculum" && (
            <CurriculumTab courseId={course.id} sections={sections} onRefresh={fetchData} />
          )}
          {activeTab === "pricing" && <PricingTab course={course} onSave={handleSave} saving={saving} />}
          {activeTab === "settings" && <SettingsTab course={course} onSave={handleSave} saving={saving} />}
        </div>
      </div>
    </div>
  );
};

export default TeacherCourseEditPage;