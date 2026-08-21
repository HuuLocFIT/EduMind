import React from "react";
import { Link } from "react-router-dom";
import type { CategoryResponse } from "@edumind/shared-types";
import { Button, CloudinaryImage } from "@edumind/user-ui";
import { BookOpen } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";

interface Props {
  categories: CategoryResponse[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const categoryPalettes = [
  {
    card: "border-blue-300 bg-blue-50/70 hover:border-blue-500",
    icon: "bg-blue-100 text-blue-700",
  },
  {
    card: "border-violet-300 bg-violet-50/70 hover:border-violet-500",
    icon: "bg-violet-100 text-violet-700",
  },
  {
    card: "border-emerald-300 bg-emerald-50/70 hover:border-emerald-500",
    icon: "bg-emerald-100 text-emerald-700",
  },
  {
    card: "border-amber-300 bg-amber-50/70 hover:border-amber-500",
    icon: "bg-amber-100 text-amber-700",
  },
  {
    card: "border-rose-300 bg-rose-50/70 hover:border-rose-500",
    icon: "bg-rose-100 text-rose-700",
  },
] as const;

export const CategoriesStrip: React.FC<Props> = ({
  categories,
  isLoading,
  isError,
  onRetry,
}) => (
  <section
    className="border-b border-gray-200 bg-white py-6 sm:py-7"
    aria-labelledby="categories-heading"
  >
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex-none lg:w-52">
          <h2
            id="categories-heading"
            className="text-lg font-bold text-gray-950"
          >
            Explore by category
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Find the skills that move you forward.
          </p>
        </div>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div
              className="-mx-4 flex gap-3 overflow-hidden px-4 lg:mx-0 lg:px-0"
              role="status"
              aria-label="Loading course categories"
            >
              {categoryPalettes.map((palette) => (
                <div
                  key={palette.card}
                  className={`flex h-16 w-[72vw] max-w-64 flex-none items-center gap-3 rounded-xl border p-3 lg:w-44 ${palette.card}`}
                  aria-hidden="true"
                >
                  <span
                    className={`h-10 w-10 animate-pulse rounded-lg motion-reduce:animate-none ${palette.icon}`}
                  />
                  <span className="flex-1">
                    <span className="block h-3.5 w-4/5 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
                    <span className="mt-2 block h-3 w-2/5 animate-pulse rounded bg-gray-200/70 motion-reduce:animate-none" />
                  </span>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-wrap items-center gap-3" role="alert">
              <p className="text-sm text-gray-700">
                Categories are unavailable right now.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                aria-label="Retry loading course categories"
              >
                Try again
              </Button>
              <Link
                className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline"
                to={USER_ROUTES.COURSES}
              >
                Browse all courses
              </Link>
            </div>
          ) : categories.length === 0 ? (
            <div
              role="status"
              className="flex items-center gap-3 text-sm text-gray-600"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span>Categories are being prepared.</span>
              <Link
                className="font-semibold text-blue-700 underline-offset-4 hover:underline"
                to={USER_ROUTES.COURSES}
              >
                Browse all courses
              </Link>
            </div>
          ) : (
            <div
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0"
              aria-label="Course categories"
            >
              {categories.slice(0, 5).map((category, index) => {
                const palette =
                  categoryPalettes[index % categoryPalettes.length];
                return (
                  <Link
                    key={category.id}
                    to={`${USER_ROUTES.COURSES}?categories=${category.id}`}
                    className={`group flex h-16 w-[72vw] max-w-64 flex-none snap-center items-center gap-3 rounded-xl border p-3 shadow-sm motion-safe:transition-colors motion-safe:duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 lg:w-44 ${palette.card}`}
                  >
                    <span
                      className={`flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-lg ${palette.icon}`}
                    >
                      {category.iconUrl ? (
                        <CloudinaryImage
                          src={category.iconUrl}
                          alt=""
                          widths={[88]}
                          className="h-7 w-7 object-contain"
                        />
                      ) : (
                        <BookOpen className="h-5 w-5" aria-hidden="true" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-gray-950">
                        {category.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-600">
                        {category.courseCount}{" "}
                        {category.courseCount === 1 ? "course" : "courses"}
                      </span>
                    </span>
                  </Link>
                );
              })}
              <Link
                to={USER_ROUTES.COURSES}
                className="inline-flex h-16 w-40 flex-none snap-center items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 text-center text-sm font-semibold text-blue-700 motion-safe:transition-colors motion-safe:duration-200 hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Browse all{" "}
                <span className="ml-1" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
);
