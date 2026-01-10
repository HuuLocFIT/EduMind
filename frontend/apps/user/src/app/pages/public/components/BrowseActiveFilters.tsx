import React from 'react';
import { Gift, X } from 'lucide-react';
import type { CategoryResponse } from '@edumind/shared-types';

interface BrowseActiveFiltersProps {
  activeFiltersCount: number;
  filterType: 'all' | 'free';
  selectedCategory: CategoryResponse | undefined;
  onCategoryChange: (id: number | null) => void;
  selectedLevel: string | null;
  onLevelChange: (level: string | null) => void;
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
  selectedCategory,
  onCategoryChange,
  selectedLevel,
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
      {selectedCategory && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Category: {selectedCategory.name}
          <button
            onClick={() => onCategoryChange(null)}
            className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
      {selectedLevel && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
          Level:{" "}
          {selectedLevel.charAt(0) + selectedLevel.slice(1).toLowerCase()}
          <button
            onClick={() => onLevelChange(null)}
            className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
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
