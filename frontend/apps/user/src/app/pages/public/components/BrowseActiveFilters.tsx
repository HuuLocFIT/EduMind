import React from 'react';
import { Gift, X } from 'lucide-react';
import type { CategoryResponse } from '@edumind/shared-types';
import { formatCourseLevel } from '../../../lib/course-level';

interface BrowseActiveFiltersProps {
  activeFiltersCount: number;
  filterType: 'all' | 'free';
  selectedCategories: CategoryResponse[];
  onCategoryChange: (id: number) => void;
  selectedLevels: string[];
  onLevelChange: (level: string) => void;
  minPrice: string;
  maxPrice: string;
  setMinPrice: (val: string) => void;
  setMaxPrice: (val: string) => void;
  setPage: (page: number) => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
}

export const BrowseActiveFilters: React.FC<BrowseActiveFiltersProps> = ({
  activeFiltersCount,
  filterType,
  selectedCategories,
  onCategoryChange,
  selectedLevels,
  onLevelChange,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  setPage,
  searchKeyword,
  setSearchKeyword,
}) => {
  if (activeFiltersCount === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filterType === "free" && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          <Gift className="w-3.5 h-3.5" />
          Free Courses
        </span>
      )}
      {selectedCategories.map((category) => (
        <span
          key={category.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium"
        >
          Category: {category.name}
          <button
            onClick={() => onCategoryChange(category.id)}
            className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {selectedLevels.map((level) => (
        <span
          key={level}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
        >
          Level: {formatCourseLevel(level)}
          <button
            onClick={() => onLevelChange(level)}
            className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      {(minPrice || maxPrice) && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
          Price: ${minPrice || "0"} - {maxPrice ? `$${maxPrice}` : "∞"}
          <button
            onClick={() => {
              setMinPrice("");
              setMaxPrice("");
              setPage(0);
            }}
            className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {searchKeyword && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
          Search: "{searchKeyword}"
          <button
            onClick={() => {
              setSearchKeyword("");
              setPage(0);
            }}
            className="hover:bg-gray-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );
};
