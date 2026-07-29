import React from 'react';
import { Sparkles, Search } from 'lucide-react';

interface BrowseHeroSectionProps {
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  onSearch: (keyword: string) => void;
}

export const BrowseHeroSection: React.FC<BrowseHeroSectionProps> = ({
  searchKeyword,
  setSearchKeyword,
  onSearch,
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
            Discover thousands of expert-led courses to advance your skills and achieve your goals.
          </p>
        </div>
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
             <form
               role="search"
               onSubmit={(e) => {
                 e.preventDefault();
                 onSearch(searchKeyword);
               }}
               className="bg-white rounded-xl flex items-center p-1.5 shadow-sm"
             >
               <Sparkles className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" aria-hidden="true" />
               <label htmlFor="course-search-input" className="sr-only">Search courses</label>
               <input
                 id="course-search-input"
                 type="text"
                 value={searchKeyword}
                 onChange={(e) => setSearchKeyword(e.target.value)}
                 placeholder="Search for courses, skills, or teachers..."
                 className="flex-1 bg-transparent border-none outline-none h-12 px-4 text-gray-900 placeholder:text-gray-400 text-base"
               />
               <button
                 type="submit"
                 aria-label="Search"
                 className="bg-blue-600 text-white rounded-lg h-10 w-10 flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0"
               >
                 <Search className="w-5 h-5" aria-hidden="true" />
               </button>
             </form>
          </div>
        </div>
      </div>
    </header>
  );
};
