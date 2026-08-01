import React from 'react';
import { Gift, X } from 'lucide-react';
import type { CategoryResponse } from '@edumind/shared-types';
import { formatCourseLevel } from '../../../lib/course-level';

interface BrowseActiveFiltersProps {
  activeFiltersCount: number;
  filterType: 'all' | 'free';
  onFilterTypeChange?: (type: 'all' | 'free') => void;
  selectedCategories: CategoryResponse[];
  onCategoryChange: (id: number) => void;
  selectedLevels: string[];
  onLevelChange: (level: string) => void;
  minPrice: string;
  maxPrice: string;
  onClearPrice: () => void;
  minRating?: number;
  onClearRating: () => void;
  appliedKeyword: string;
  onClearSearch: () => void;
}

export const BrowseActiveFilters: React.FC<BrowseActiveFiltersProps> = ({
  activeFiltersCount,
  filterType,
  onFilterTypeChange,
  selectedCategories,
  onCategoryChange,
  selectedLevels,
  onLevelChange,
  minPrice,
  maxPrice,
  onClearPrice,
  minRating,
  onClearRating,
  appliedKeyword,
  onClearSearch,
}) => {
  if (activeFiltersCount === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Active filters">
      {filterType === "free" && (
        <span role="listitem" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          <Gift className="w-3.5 h-3.5" aria-hidden="true" />
          Free Courses
          <button
            onClick={() => onFilterTypeChange?.("all")}
            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            aria-label="Remove free filter"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      )}
      {selectedCategories.map((category) => (
        <span
          key={category.id}
          role="listitem"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium"
        >
          Category: {category.name}
          <button
            onClick={() => onCategoryChange(category.id)}
            className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
            aria-label={`Remove category filter: ${category.name}`}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {selectedLevels.map((level) => (
        <span
          key={level}
          role="listitem"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
        >
          Level: {formatCourseLevel(level)}
          <button
            onClick={() => onLevelChange(level)}
            className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
            aria-label={`Remove level filter: ${formatCourseLevel(level)}`}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {(minPrice || maxPrice) && (
        <span role="listitem" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
          Price: ${minPrice || "0"} - {maxPrice ? `$${maxPrice}` : "∞"}
          <button
            onClick={onClearPrice}
            className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
            aria-label="Remove price filter"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      )}
      {minRating && (
        <span role="listitem" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-900 rounded-full text-sm font-medium">
          Rating: {minRating} &amp; up
          <button
            onClick={onClearRating}
            className="hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
            aria-label={`Remove minimum rating filter: ${minRating} and up`}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      )}
      {appliedKeyword && (
        <span role="listitem" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
          Search: "{appliedKeyword}"
          <button
            onClick={onClearSearch}
            className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
            aria-label="Remove search keyword filter"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </span>
      )}
    </div>
  );
};
