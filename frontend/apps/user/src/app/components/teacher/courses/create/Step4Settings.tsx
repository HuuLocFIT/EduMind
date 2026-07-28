import React from "react";
import { Input, Textarea, Switch } from "@edumind/user-ui";
import { Globe } from "lucide-react";
import { stripHtml } from "@edumind/shared-utils";
import type { StepProps } from "./types";

export const Step4Settings: React.FC<StepProps> = ({ data, onChange, errors }) => {
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
            helperText="Recommended: 50-60 characters"
          />
          <p className="text-xs text-gray-500 mt-1">{(data.metaTitle || "").length}/60 characters</p>
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
          <p className="text-xs text-gray-500 mt-1">
            {(data.metaDescription || "").length}/160 characters (recommended)
          </p>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-3">Search Preview</h3>
        <div className="p-4 border rounded-lg bg-white max-w-[600px]">
          <div className="flex items-center gap-1.5 text-sm text-green-700 mb-0.5">
            <Globe className="w-3 h-3" />
            <span>edumind.nguyenloc.dev</span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-500">Courses</span>
          </div>
          <p className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
            {data.metaTitle || data.title || "Course Title"} | EduMind
          </p>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
            {data.metaDescription || stripHtml(data.shortDescription) || stripHtml(data.description)?.substring(0, 160) || "Course description will appear here"}
          </p>
        </div>
      </div>
    </div>
  );
};

