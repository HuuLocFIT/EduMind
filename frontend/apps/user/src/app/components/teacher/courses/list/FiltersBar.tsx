import React from "react";
import { CourseStatus } from "@edumind/shared-constants";
import { Input } from "@edumind/user-ui";
import { Search, Grid, List } from "lucide-react";
import type { FilterState, ViewMode } from "./types";

interface FiltersBarProps {
  filters: FilterState;
  viewMode: ViewMode;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filters,
  viewMode,
  onFilterChange,
  onViewModeChange,
}) => {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search courses..."
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="ALL">All Status</option>
          <option value={CourseStatus.DRAFT}>Draft</option>
          <option value={CourseStatus.PUBLISHED}>Published</option>
          <option value={CourseStatus.ARCHIVED}>Archived</option>
        </select>

        {/* View Toggle */}
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`p-2 ${
              viewMode === "grid"
                ? "bg-green-50 text-green-600"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            title="Grid View"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-2 ${
              viewMode === "list"
                ? "bg-green-50 text-green-600"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
