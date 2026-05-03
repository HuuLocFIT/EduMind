import React from "react";
import { CourseLevel } from "@edumind/shared-constants";
import { Input, Textarea } from "@edumind/user-ui";
import { RichTextEditor } from "../../../ui/RichTextEditor";
import type { StepProps } from "./types";

export const Step1BasicInfo: React.FC<StepProps> = ({
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
          error={errors["title"]}
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
          error={errors["slug"]}
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
          error={errors["shortDescription"]}
        />
        <p className="text-xs text-gray-500 mt-1">
          {data.shortDescription?.length || 0}/500 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Full Description <span className="text-red-500">*</span>
        </label>
        <RichTextEditor
          value={data.description || ""}
          onChange={(html) => onChange({ description: html })}
          rows={6}
        />
        {errors["description"] && (
          <p className="text-sm text-red-600 mt-1">{errors["description"]}</p>
        )}
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
              errors["categoryId"] ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors["categoryId"] && (
            <p className="text-sm text-red-600 mt-1">{errors["categoryId"]}</p>
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
              errors["level"] ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select level</option>
            <option value={CourseLevel.BEGINNER}>Beginner</option>
            <option value={CourseLevel.INTERMEDIATE}>Intermediate</option>
            <option value={CourseLevel.ADVANCED}>Advanced</option>
            <option value={CourseLevel.ALL_LEVELS}>All Levels</option>
          </select>
          {errors["level"] && (
            <p className="text-sm text-red-600 mt-1">{errors["level"]}</p>
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
        </select>
      </div>
    </div>
  );
};
