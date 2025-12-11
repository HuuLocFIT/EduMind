import React, { useState, useEffect } from "react";
import { Input, Button } from "@edumind/user-ui";
import { Search } from "lucide-react";

interface CourseSearchBarProps {
  onSearch: (keyword: string) => void;
  value?: string;
  placeholder?: string;
  className?: string;
}

export const CourseSearchBar: React.FC<CourseSearchBarProps> = ({
  onSearch,
  value = "",
  placeholder = "Search courses...",
  className = "",
}) => {
  const [keyword, setKeyword] = useState(value);

  // Sync with parent value prop
  useEffect(() => {
    setKeyword(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword);
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <div className="flex-1">
        <Input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={placeholder}
          className="w-full"
        />
      </div>
      <Button type="submit" variant="primary">
        <Search className="w-4 h-4" />
      </Button>
    </form>
  );
};
