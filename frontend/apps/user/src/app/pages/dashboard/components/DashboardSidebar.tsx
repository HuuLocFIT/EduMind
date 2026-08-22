import React from "react";
import type { CategoryResponse } from "@edumind/shared-types";
import { CloudinaryImage } from "@edumind/user-ui";
import {
  BookOpen,
  GraduationCap,
  Heart,
  Award,
  Lightbulb,
  Tag,
  ChevronRight,
} from "lucide-react";

const categoryPalettes = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
] as const;

interface DashboardSidebarProps {
  wishlistCount: number;
  categories: CategoryResponse[];
  onGoToLearning: () => void;
  onBrowseCourses: () => void;
  onGoToWishlist: () => void;
  onGoToCertificates: () => void;
  onCategoryClick: (categoryId: number) => void;
  categoriesError?: boolean;
  onRetryCategories?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  wishlistCount,
  categories,
  onGoToLearning,
  onBrowseCourses,
  onGoToWishlist,
  onGoToCertificates,
  onCategoryClick,
  categoriesError = false,
  onRetryCategories,
}) => {
  return (
    <aside className="lg:w-80 space-y-6">
      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={onGoToLearning}
            className="group flex h-[62px] w-full items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2.5 text-left transition-colors hover:border-indigo-100 hover:bg-indigo-50"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="font-medium text-slate-900">My Learning</span>
          </button>
          <button
            onClick={onBrowseCourses}
            className="group flex h-[62px] w-full items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2.5 text-left transition-colors hover:border-blue-100 hover:bg-blue-50"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-medium text-slate-900">Browse Courses</span>
          </button>

          <button
            onClick={onGoToWishlist}
            className="group flex h-[62px] w-full items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2.5 text-left transition-colors hover:border-red-100 hover:bg-red-50"
          >
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="font-medium text-slate-900">My Wishlist</span>
              {wishlistCount > 0 && (
                <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={onGoToCertificates}
            className="group flex h-[62px] w-full items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2.5 text-left transition-colors hover:border-green-100 hover:bg-green-50"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <span className="font-medium text-slate-900">Certificates</span>
          </button>
        </div>
      </div>

      {/* Course categories */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Tag className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Explore Categories
          </h3>
          <p className="mt-1 text-sm text-slate-500">Discover something new</p>
        </div>
        {categoriesError ? (
          <div
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            <p>Could not load categories.</p>
            <button
              type="button"
              onClick={onRetryCategories}
              className="mt-2 font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        ) : (
          <div
            className="space-y-2"
            role="group"
            aria-label="Course categories"
          >
            {categories.slice(0, 2).map((category, index) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryClick(category.id)}
                className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2.5 text-left transition-colors hover:border-blue-100 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <span
                  className={`flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg ${categoryPalettes[index % categoryPalettes.length]}`}
                >
                  {category.iconUrl ? (
                    <CloudinaryImage
                      src={category.iconUrl}
                      alt=""
                      widths={[80]}
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                    {category.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {category.courseCount}{" "}
                    {category.courseCount === 1 ? "course" : "courses"}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 flex-none text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onBrowseCourses}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Browse all categories
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Learning Tip */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Learning Tip</h3>
            <p className="text-slate-600 text-sm">
              Choose one lesson to focus on, take notes, and continue when you
              are ready.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
