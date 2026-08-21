import React from "react";
import { Search, X } from "lucide-react";

interface PublicCourseSearchProps {
  id: string;
  value: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  inputLabel?: string;
  submitLabel?: string;
  className?: string;
}

export const PublicCourseSearch: React.FC<PublicCourseSearchProps> = ({
  id,
  value,
  onInputChange,
  onSubmit,
  onClear,
  inputLabel = "Search courses",
  submitLabel = "Search",
  className = "",
}) => (
  <form
    role="search"
    aria-label="Search EduMind courses"
    className={`rounded-2xl border border-white/25 bg-white/10 p-1.5 shadow-xl backdrop-blur-md ${className}`}
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <div className="flex min-w-0 items-center rounded-[0.8rem] bg-white p-1">
      <Search
        className="ml-3 hidden h-5 w-5 flex-none text-gray-400 sm:block"
        aria-hidden="true"
      />
      <input
        id={id}
        type="text"
        aria-label={inputLabel}
        value={value}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder="Search courses..."
        className="h-11 min-w-0 flex-1 border-none bg-transparent px-3 text-base text-gray-950 outline-none placeholder:text-gray-500"
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear course search"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <button
        type="submit"
        aria-label={submitLabel}
        className="min-h-11 flex-shrink-0 rounded-[0.65rem] bg-blue-600 px-4 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:px-5"
      >
        Search
      </button>
    </div>
  </form>
);
