import React from 'react';
import type { CategoryResponse } from '@edumind/shared-types';
import { Tag } from 'lucide-react';

interface CategoriesSectionProps {
  categories: CategoryResponse[];
  onCategoryClick: (categoryId: number) => void;
}

export const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  onCategoryClick,
}) => {
  if (categories.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5 text-blue-600" />
        Browse by Category
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryClick(category.id)}
            className="flex-shrink-0 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all whitespace-nowrap"
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};
