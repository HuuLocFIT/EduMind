import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { teacherCourseService } from "../../services/teacher-course.service";
import { categoryService } from "../../services/category.service";
import { fileUploadService } from "../../services";
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseLevel } from "@edumind/shared-constants";
import {
  CreateCourseRequestSchema,
  type CreateCourseRequest,
  type CategoryResponse,
} from "@edumind/shared-types";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Alert,
  useToast,
  FileUpload,
  type UploadedFile,
} from "@edumind/user-ui";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  BookOpen,
  Image,
  DollarSign,
  Settings,
  Loader2,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface StepProps {
  data: Partial<CreateCourseRequest>;
  onChange: (data: Partial<CreateCourseRequest>) => void;
  errors: Record<string, string>;
  categories: CategoryResponse[];
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

const Step1BasicInfo: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
  categories,
}) => {
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Course Title <span className="text-red-500">*</span>
        </label>
        <Input
          value={data.title || ""}
          onChange={(e) => {
            const title = e.target.value;
            onChange({
              title,
              slug: generateSlug(title),
            });
          }}
          placeholder="e.g., Complete Web Development Bootcamp"
          error={errors['title']}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL Slug <span className="text-red-500">*</span>
        </label>
        <Input
          value={data.slug || ""}
          onChange={(e) => onChange({ slug: e.target.value })}
          placeholder="complete-web-development-bootcamp"
          error={errors['slug']}
          helperText="This will be used in the course URL"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Short Description
        </label>
        <Textarea
          value={data.shortDescription || ""}
          onChange={(e) => onChange({ shortDescription: e.target.value })}
          placeholder="Brief overview of your course (max 500 characters)"
          rows={2}
          error={errors['shortDescription']}
        />
        <p className="text-xs text-gray-500 mt-1">
          {data.shortDescription?.length || 0}/500 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Description <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Detailed description of what students will learn..."
          rows={6}
          error={errors['description']}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={data.categoryId || ""}
            onChange={(e) => onChange({ categoryId: Number(e.target.value) })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors['categoryId'] ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors['categoryId'] && (
            <p className="text-sm text-red-600 mt-1">{errors['categoryId']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level <span className="text-red-500">*</span>
          </label>
          <select
            value={data.level || ""}
            onChange={(e) => onChange({ level: e.target.value as any })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              errors['level'] ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select level</option>
            <option value={CourseLevel.BEGINNER}>Beginner</option>
            <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
            <option value={CourseLevel.ADVANCED}>Advanced</option>
            <option value={CourseLevel.ALL_LEVELS}>All Levels</option>
          </select>
          {errors['level'] && (
            <p className="text-sm text-red-600 mt-1">{errors['level']}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Language
        </label>
        <select
          value={data.language || "en"}
          onChange={(e) => onChange({ language: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="en">English</option>
          <option value="vi">Vietnamese</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="zh">Chinese</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
        </select>
      </div>
    </div>
  );
};

const Step2Media: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const [thumbnailFiles, setThumbnailFiles] = useState<UploadedFile[]>([]);

  const handleFilesChange = async (files: UploadedFile[]) => {
    setThumbnailFiles(files);
    
    // Nếu có file mới và chưa upload
    const pendingFile = files.find(f => f.status === 'pending');
    if (pendingFile) {
      try {
        // Update status to uploading
        pendingFile.status = 'uploading';
        setThumbnailFiles([...files]);
        
        // Upload file
        const response = await fileUploadService.uploadFile(pendingFile.file);
        
        // Update status to success và set URL
        pendingFile.status = 'success';
        pendingFile.url = response.url;
        setThumbnailFiles([...files]);
        
        // Update form data với thumbnail URL
        onChange({ thumbnailUrl: response.url });
      } catch (err: any) {
        // Update status to error
        pendingFile.status = 'error';
        pendingFile.error = err.message || 'Failed to upload image';
        setThumbnailFiles([...files]);
      }
    } else if (files.length === 0) {
      // Nếu xóa file, clear thumbnail URL
      onChange({ thumbnailUrl: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Course Thumbnail
        </label>
        {data.thumbnailUrl ? (
          <div className="relative border-2 border-gray-300 rounded-lg p-6">
            <img
              src={data.thumbnailUrl}
              alt="Thumbnail"
              className="w-full aspect-video object-cover rounded-lg"
            />
            <button
              onClick={() => {
                onChange({ thumbnailUrl: undefined });
                setThumbnailFiles([]);
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ) : (
          <FileUpload
            accept="image/*"
            multiple={false}
            maxSize={5}
            maxFiles={1}
            onFilesChange={handleFilesChange}
            helperText="Recommended: 1280x720px (16:9 ratio). Max 5MB"
          />
        )}
        {errors['thumbnailUrl'] && (
          <p className="text-sm text-red-600 mt-2">{errors['thumbnailUrl']}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preview Video URL
        </label>
        <Input
          value={data.previewVideoUrl || ""}
          onChange={(e) => onChange({ previewVideoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          error={errors['previewVideoUrl']}
          helperText="YouTube, Vimeo, or direct video URL"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estimated Duration (hours)
        </label>
        <Input
          type="number"
          min={0}
          value={data.durationHours || ""}
          onChange={(e) =>
            onChange({ durationHours: Number(e.target.value) || undefined })
          }
          placeholder="e.g., 10"
          error={errors['durationHours']}
        />
      </div>
    </div>
  );
};

const Step3Pricing: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const [isFree, setIsFree] = useState(data.price === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Free Course</p>
          <p className="text-sm text-gray-600">
            Make this course available for free
          </p>
        </div>
        <Switch
          checked={isFree}
          onChange={(checked) => {
            setIsFree(checked.target.checked);
            onChange({ price: checked ? 0 : undefined });
          }}
        />
      </div>

      {!isFree && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={data.price || ""}
                onChange={(e) => onChange({ price: Number(e.target.value) })}
                placeholder="99.99"
                error={errors['price']}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={data.currency || "USD"}
                onChange={(e) => onChange({ currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="VND">VND (₫)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Price (optional)
            </label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={data.discountPrice || ""}
              onChange={(e) =>
                onChange({ discountPrice: Number(e.target.value) || undefined })
              }
              placeholder="79.99"
              error={errors['discountPrice']}
              leftIcon={<DollarSign className="w-4 h-4" />}
              helperText="Leave empty for no discount"
            />
          </div>
        </>
      )}
    </div>
  );
};

const Step4Settings: React.FC<StepProps> = ({ data, onChange, errors }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Course Features</h3>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Certificate</p>
            <p className="text-sm text-gray-600">
              Award certificate upon completion
            </p>
          </div>
          <Switch
            checked={data.hasCertificate || false}
            onChange={(checked) => onChange({ hasCertificate: checked.target.checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Subtitles</p>
            <p className="text-sm text-gray-600">
              Course includes subtitles/captions
            </p>
          </div>
          <Switch
            checked={data.hasSubtitles || false}
            onChange={(checked) => onChange({ hasSubtitles: checked.target.checked })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">SEO Settings</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Title
          </label>
          <Input
            value={data.metaTitle || ""}
            onChange={(e) => onChange({ metaTitle: e.target.value })}
            placeholder="SEO title for search engines"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
          </label>
          <Textarea
            value={data.metaDescription || ""}
            onChange={(e) => onChange({ metaDescription: e.target.value })}
            placeholder="SEO description for search engines"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Keywords
          </label>
          <Input
            value={data.metaKeywords || ""}
            onChange={(e) => onChange({ metaKeywords: e.target.value })}
            placeholder="keyword1, keyword2, keyword3"
            helperText="Comma-separated keywords"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const STEPS = [
  { id: 1, title: "Basic Info", icon: BookOpen },
  { id: 2, title: "Media", icon: Image },
  { id: 3, title: "Pricing", icon: DollarSign },
  { id: 4, title: "Settings", icon: Settings },
];

export const TeacherCourseCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast, success: showSuccess, error: showError } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<CreateCourseRequest>>({
    currency: "USD",
    language: "en",
    hasCertificate: false,
    hasSubtitles: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories
  useEffect(() => {
    categoryService
      .getActiveCategories()
      .then(setCategories)
      .catch(console.error);
  }, []);

  const updateFormData = (updates: Partial<CreateCourseRequest>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const clearedErrors = { ...errors };
    Object.keys(updates).forEach((key) => delete clearedErrors[key]);
    setErrors(clearedErrors);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData['title']?.trim()) newErrors['title'] = "Title is required";
      if (!formData['slug']?.trim()) newErrors['slug'] = "Slug is required";
      if (!formData.description?.trim())
        newErrors['description'] = "Description is required";
      if (!formData['categoryId']) newErrors['categoryId'] = "Category is required";
      if (!formData['level']) newErrors['level'] = "Level is required";
    }

    if (step === 3) {
      if (formData.price === undefined || formData.price === null) {
        newErrors['price'] = "Price is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setSubmitting(true);
      const course = await teacherCourseService.createCourse(
        formData as CreateCourseRequest
      );
      showSuccess("Course created successfully!");
      navigate(TeacherRouteHelpers.courseEdit(course.id));
    } catch (err: any) {
      showError(err.message || "Failed to create course");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(TEACHER_ROUTES.COURSES)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-600 mt-1">
          Fill in the details to create your course
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    currentStep > step.id
                      ? "bg-green-600 border-green-600 text-white"
                      : currentStep === step.id
                      ? "border-green-600 text-green-600"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-sm mt-2 ${
                    currentStep >= step.id ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.id ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        {currentStep === 1 && (
          <Step1BasicInfo
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
        {currentStep === 2 && (
          <Step2Media
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
        {currentStep === 3 && (
          <Step3Pricing
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
        {currentStep === 4 && (
          <Step4Settings
            data={formData}
            onChange={updateFormData}
            errors={errors}
            categories={categories}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={handlePrev}
          disabled={currentStep === 1}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        {currentStep < STEPS.length ? (
          <Button
            variant="primary"
            onClick={handleNext}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700"
          >
            Next
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitting}
            leftIcon={<Check className="w-4 h-4" />}
            className="bg-green-600 hover:bg-green-700"
          >
            Create Course
          </Button>
        )}
      </div>
    </div>
  );
};

export default TeacherCourseCreatePage;
