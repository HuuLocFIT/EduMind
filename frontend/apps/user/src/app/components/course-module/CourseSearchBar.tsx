import React, { useState } from "react";
import { Input, Button } from "@edumind/user-ui";
import { Search } from "lucide-react";

interface CourseSearchBarProps {
  onSearch: (keyword: string) => void;
  placeholder?: string;
  className?: string;
}

export const CourseSearchBar: React.FC<CourseSearchBarProps> = ({
  onSearch,
  placeholder = "Search courses...",
  className = "",
}) => {
  const [keyword, setKeyword] = useState("");

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
