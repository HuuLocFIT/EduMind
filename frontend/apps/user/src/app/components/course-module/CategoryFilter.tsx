import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import type { CategoryResponse } from "@edumind/shared-types";

interface CategoryFilterProps {
  categories: CategoryResponse[];
  selectedCategoryIds: number[];
  onSelectCategory: (categoryId: number) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryIds,
  onSelectCategory,
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  // Show top 6 categories by default, rest when expanded
  const topCategories = filteredCategories.slice(0, 6);
  const remainingCategories = filteredCategories.slice(6);
  const displayCategories = showMore
    ? filteredCategories
    : topCategories;

  // Get selected category names for chips
  const selectedCategories = useMemo(() => {
    return categories.filter((cat) => selectedCategoryIds.includes(cat.id));
  }, [categories, selectedCategoryIds]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Categories as Chips */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedCategories.map((category) => (
            <span
              key={category.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium"
            >
              {category.name}
              <button
                onClick={() => onSelectCategory(category.id)}
                className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Category List */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {displayCategories.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No categories found</p>
        ) : (
          displayCategories.map((category) => {
            const isSelected = selectedCategoryIds.includes(category.id);
            return (
              <label
                key={category.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onSelectCategory(category.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="flex-1 text-sm text-gray-700">
                  {category.name}
                </span>
                {category.courseCount !== undefined && (
                  <span className="text-xs text-gray-500">
                    ({category.courseCount})
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>

      {/* Show More / Show Less */}
      {remainingCategories.length > 0 && (
        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-2"
        >
          {showMore ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show More ({remainingCategories.length})
            </>
          )}
        </button>
      )}
    </div>
  );
};
