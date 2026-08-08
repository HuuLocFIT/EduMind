import React, { useState, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input } from '@edumind/user-ui';
import { CategoryFilter } from '../../../components/course-module';
import { PriceRangeSlider } from './PriceRangeSlider';
import type { CategoryResponse } from '@edumind/shared-types';
import { formatCourseLevel } from '../../../lib/course-level';

interface BrowseFilterSidebarProps {
  categories: CategoryResponse[];
  selectedCategoryIds: number[];
  onCategoryChange: (id: number) => void;
  selectedLevels: string[];
  onLevelChange: (level: string) => void;
  minPrice: string;
  maxPrice: string;
  setMinPrice: (val: string) => void;
  setMaxPrice: (val: string) => void;
  minRating?: number;
  setMinRating: (rating: number | undefined) => void;
  filterType: 'all' | 'free';
  onFilterTypeChange?: (type: 'all' | 'free') => void;
  onClearFilters: () => void;
  showClearButton: boolean;
  idPrefix?: string;
}

interface FilterSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps & { sectionId: string; idPrefix: string }> = ({
  title,
  count,
  defaultOpen = true,
  children,
  sectionId,
  idPrefix,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `${idPrefix}-filter-section-${sectionId}`;

  return (
    <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title} filter`}
        className="w-full flex items-center justify-between py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
        )}
      </button>
      {isOpen && <div id={contentId} className="mt-3">{children}</div>}
    </div>
  );
};

export const BrowseFilterSidebar: React.FC<BrowseFilterSidebarProps> = ({
  categories,
  selectedCategoryIds,
  onCategoryChange,
  selectedLevels,
  onLevelChange,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  minRating,
  setMinRating,
  filterType,
  onFilterTypeChange,
  onClearFilters,
  showClearButton,
  idPrefix = "desktop",
}) => {
  const PRICE_MIN = 0;
  const PRICE_MAX = 200;

  // Convert string prices to numbers for slider
  const priceRange: [number, number] = useMemo(() => {
    const min = minPrice ? Number(minPrice) : PRICE_MIN;
    const max = maxPrice ? Number(maxPrice) : PRICE_MAX;
    return [Math.max(PRICE_MIN, min), Math.min(PRICE_MAX, max)];
  }, [minPrice, maxPrice]);

  const handlePriceRangeChange = (value: [number, number]) => {
    const [newMin, newMax] = value;
    setMinPrice(newMin === PRICE_MIN ? "" : String(newMin));
    setMaxPrice(newMax === PRICE_MAX ? "" : String(newMax));
  };

  const handleMinPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinPrice(e.target.value);
  };

  const handleMaxPriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxPrice(e.target.value);
  };

  const handleFreeToggle = () => {
    const newType = filterType === "free" ? "all" : "free";
    onFilterTypeChange?.(newType);
  };

  const ratingOptions = [
    { value: 4.5, label: "4.5 & up", stars: "★★★★★" },
    { value: 4.0, label: "4.0 & up", stars: "★★★★☆" },
    { value: 3.0, label: "3.0 & up", stars: "★★★☆☆" },
  ];

  const levelOptions = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0 mb-8 lg:mb-0" aria-label="Course filters">
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 lg:sticky lg:top-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>

        {/* Category Filter */}
        <FilterSection
          title="Categories"
          count={selectedCategoryIds.length}
          defaultOpen={true}
          sectionId="categories"
          idPrefix={idPrefix}
        >
          <CategoryFilter
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            onSelectCategory={onCategoryChange}
            idPrefix={`${idPrefix}-category`}
          />
        </FilterSection>

        {/* Level Filter */}
        <FilterSection
          title="Level"
          count={selectedLevels.length}
          defaultOpen={true}
          sectionId="level"
          idPrefix={idPrefix}
        >
          <div className="space-y-2" role="group" aria-label="Level">
            {levelOptions.map((level) => {
              const isSelected = selectedLevels.includes(level);
              return (
                <label
                  key={level}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onLevelChange(level)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  <span className="text-sm text-gray-700">
                    {formatCourseLevel(level)}
                  </span>
                </label>
              );
            })}
          </div>
        </FilterSection>

        {/* Price Range Filter */}
        <FilterSection
          title="Price Range"
          count={minPrice || maxPrice ? 1 : 0}
          defaultOpen={true}
          sectionId="price-range"
          idPrefix={idPrefix}
        >
          <div className="space-y-4">
            {/* Free Only Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filterType === "free"}
                onChange={handleFreeToggle}
                aria-describedby={filterType === "free" ? `${idPrefix}-free-only-info` : undefined}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Free only</span>
            </label>

            {filterType !== "free" && (
              <>
                {/* Range Slider */}
                <PriceRangeSlider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={priceRange}
                  onChange={handlePriceRangeChange}
                />

                {/* Number Inputs for Precise Control */}
                <fieldset className="grid grid-cols-2 gap-3">
                  <legend className="sr-only">Price range values</legend>
                  <div>
                    <label htmlFor={`${idPrefix}-min-price`} className="block text-xs text-gray-600 mb-1">
                      Min ($)
                    </label>
                    <Input
                      id={`${idPrefix}-min-price`}
                      type="number"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step="0.01"
                      value={minPrice}
                      onChange={handleMinPriceInputChange}
                      placeholder="0"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${idPrefix}-max-price`} className="block text-xs text-gray-600 mb-1">
                      Max ($)
                    </label>
                    <Input
                      id={`${idPrefix}-max-price`}
                      type="number"
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step="0.01"
                      value={maxPrice}
                      onChange={handleMaxPriceInputChange}
                      placeholder="No limit"
                      className="text-sm"
                    />
                  </div>
                </fieldset>
              </>
            )}

            {filterType === "free" && (
              <p id={`${idPrefix}-free-only-info`} className="text-xs text-gray-500">
                Showing free courses only (price = $0)
              </p>
            )}
          </div>
        </FilterSection>

        {/* Rating Filter */}
        <FilterSection
          title="Rating"
          count={minRating ? 1 : 0}
          defaultOpen={false}
          sectionId="rating"
          idPrefix={idPrefix}
        >
          <div className="space-y-2" role="radiogroup" aria-label="Minimum rating">
            <label htmlFor={`${idPrefix}-rating-all`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <input
                id={`${idPrefix}-rating-all`}
                type="radio"
                name={`${idPrefix}-rating`}
                checked={!minRating}
                onChange={() => setMinRating(undefined)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">All Ratings</span>
            </label>
            {ratingOptions.map((option) => (
              <label
                key={option.value}
                htmlFor={`${idPrefix}-rating-${option.value}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  id={`${idPrefix}-rating-${option.value}`}
                  type="radio"
                  aria-label={`Minimum rating ${option.label}`}
                  name={`${idPrefix}-rating`}
                  checked={minRating === option.value}
                  onChange={() => setMinRating(option.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-yellow-500">{option.stars}</span>
                  <span>{option.label}</span>
                </span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Clear Filters */}
        {showClearButton && (
          <Button
            variant="secondary"
            onClick={onClearFilters}
            className="w-full mt-4"
          >
            Clear All Filters
          </Button>
        )}
      </div>
    </aside>
  );
};
