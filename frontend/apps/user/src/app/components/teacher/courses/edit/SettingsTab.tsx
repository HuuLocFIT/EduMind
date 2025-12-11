import React, { useState } from "react";
import type { CourseDetailResponse, UpdateCourseRequest } from "@edumind/shared-types";
import { Button, Input, Textarea, Switch } from "@edumind/user-ui";
import { Save } from "lucide-react";

interface SettingsTabProps {
  course: CourseDetailResponse;
  onSave: (data: Partial<UpdateCourseRequest>) => Promise<void>;
  saving: boolean;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ course, onSave, saving }) => {
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

