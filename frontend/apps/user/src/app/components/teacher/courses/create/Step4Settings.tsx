import React from "react";
import { Input, Textarea, Switch } from "@edumind/user-ui";
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

