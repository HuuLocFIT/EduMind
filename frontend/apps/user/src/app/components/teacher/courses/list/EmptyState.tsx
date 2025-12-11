import React from "react";
import { Button } from "@edumind/user-ui";
import { BookOpen, Plus } from "lucide-react";
import type { FilterState } from "./types";

interface EmptyStateProps {
  filters: FilterState;
  onCreateCourse: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  filters,
  onCreateCourse,
}) => {
  const hasFilters = filters.search || filters.status !== "ALL";

  return (
    <div className="bg-white rounded-xl border p-12 text-center">
      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {hasFilters ? "No courses found" : "No courses yet"}
      </h3>
      <p className="text-gray-600 mb-6">
        {hasFilters
          ? "Try adjusting your filters"
          : "Create your first course to get started"}
      </p>
      {!hasFilters && (
        <Button
          variant="primary"
          onClick={onCreateCourse}
          leftIcon={<Plus className="w-4 h-4" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Create Your First Course
        </Button>
      )}
    </div>
  );
};

