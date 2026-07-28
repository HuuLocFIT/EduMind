import React, { useState } from "react";
import type { CourseDetailResponse, UpdateCourseRequest } from "@edumind/shared-types";
import { stripHtml } from "@edumind/shared-utils";
import { Button, Input, Textarea, Switch } from "@edumind/user-ui";
import { Save, Globe } from "lucide-react";

interface SettingsTabProps {
  course: CourseDetailResponse;
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ course, onSave, saving }) => {
  const [formData, setFormData] = useState({
    hasCertificate: course.hasCertificate,
    metaTitle: course.metaTitle || "",
    metaDescription: course.metaDescription || "",
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

        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Search Preview</h3>
        <div className="p-4 border rounded-lg bg-white max-w-[600px]">
          <div className="flex items-center gap-1.5 text-sm text-green-700 mb-0.5">
            <Globe className="w-3 h-3" />
            <span>edumind.nguyenloc.dev</span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-500">Courses</span>
          </div>
          <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
            {formData.metaTitle || course.title} | EduMind
          </p>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {formData.metaDescription || stripHtml(course.shortDescription) || stripHtml(course.description).substring(0, 160)}
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

