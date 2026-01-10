import React from 'react';
import { Filter } from 'lucide-react';
import { Button, Input } from '@edumind/user-ui';
import { CategoryFilter } from '../../../components/course-module';
import type { CategoryResponse } from '@edumind/shared-types';

interface BrowseFilterSidebarProps {
  categories: CategoryResponse[];
  selectedCategoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  selectedLevel: string | null;
  onLevelChange: (level: string | null) => void;
  minPrice: string;
  maxPrice: string;
  setMinPrice: (val: string) => void;
  setMaxPrice: (val: string) => void;
  filterType: 'all' | 'free';
  setPage: (page: number) => void;
  onClearFilters: () => void;
  showClearButton: boolean;
}

export const BrowseFilterSidebar: React.FC<BrowseFilterSidebarProps> = ({
  categories,
  selectedCategoryId,
  onCategoryChange,
  selectedLevel,
  onLevelChange,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  filterType,
  setPage,
  onClearFilters,
  showClearButton,
}) => {
  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0 mb-8 lg:mb-0">
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 lg:sticky lg:top-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        {/* Category Filter */}
        <CategoryFilter
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onCategoryChange}
        />

        {/* Level Filter */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Level</h3>
          <div className="space-y-2">
            {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((level) => (
              <button
                key={level}
                onClick={() =>
                  onLevelChange(
                    selectedLevel === level ? null : level
                  )
                }
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-200 font-medium ${
                  selectedLevel === level
                    ? "bg-blue-600 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {level.charAt(0) + level.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Price Filter */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Price Range
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Min Price ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(0);
                }}
                placeholder="0"
                disabled={filterType === "free"}
                title={
                  filterType === "free"
                    ? "Price filter is set to free (0) when viewing free courses"
                    : undefined
                }
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Max Price ($)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(0);
                }}
                placeholder="No limit"
                disabled={filterType === "free"}
                title={
                  filterType === "free"
                    ? "Price filter is set to free (0) when viewing free courses"
                    : undefined
                }
              />
            </div>
          </div>
          {filterType === "free" && (
            <p className="text-xs text-gray-500 mt-2">
              Showing free courses only (price = $0)
            </p>
          )}
        </div>

        {/* Clear Filters */}
        {showClearButton && (
          <Button
            variant="secondary"
            onClick={onClearFilters}
            className="w-full"
          >
            Clear All Filters
          </Button>
        )}
      </div>
    </aside>
  );
};
