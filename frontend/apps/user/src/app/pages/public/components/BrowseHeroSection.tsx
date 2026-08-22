import React from 'react';
import { Sparkles } from 'lucide-react';
import { PublicCourseSearch } from './PublicCourseSearch';

interface BrowseHeroSectionProps {
  value: string;
  onInputChange: (keyword: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export const BrowseHeroSection: React.FC<BrowseHeroSectionProps> = ({
  value,
  onInputChange,
  onSubmit,
  onClear,
}) => {
  return (
    <header role="banner" className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-8">
           <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full text-blue-100 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 text-amber-300" aria-hidden="true" />
              <span>Explore your potential</span>
           </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Browse Courses
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Build practical skills and reach your goals with expert-led courses.
          </p>
        </div>
        <div className="w-full max-w-2xl mx-auto">
          <PublicCourseSearch
            id="course-search-input"
            value={value}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onClear={onClear}
          />
        </div>
      </div>
    </header>
  );
};
