import React, { useState } from "react";
import { CourseLevel } from "@edumind/shared-constants";
import type {
  CourseDetailResponse,
  UpdateCourseRequest,
  CategoryResponse,
} from "@edumind/shared-types";
import { Button, Input, Textarea } from "@edumind/user-ui";
import { RichTextEditor } from "@user/components/ui/RichTextEditor";
import { Save } from "lucide-react";

interface BasicInfoTabProps {
  course: CourseDetailResponse;
  categories: CategoryResponse[];
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
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
            <RichTextEditor
              value={formData.description}
              onChange={(html) => handleChange("description", html)}
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

