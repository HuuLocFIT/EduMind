import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@edumind/user-ui";
import type { CategoryResponse, CourseResponse } from "@edumind/shared-types";
import { UserRole } from "@edumind/shared-constants";
import { buildRouteWithParams, USER_ROUTES } from "@edumind/shared-utils";
import { useNavigate } from "react-router-dom";
import { CourseGrid, CourseGridSkeleton } from "../../components/course-module";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";
import { queryKeys } from "../../lib/query-keys";
import {
  STALE_TIME_CATEGORIES,
  STALE_TIME_COURSES_PUBLIC,
} from "../../lib/query-config";
import { useAuthStore } from "../../stores/auth.store";
import { categoryService } from "../../services/category.service";
import { courseService } from "../../services/course.service";
import { useAuthUiReady } from "../../hooks";
import {
  CategoriesStrip,
  FinalCtaSection,
  HomeHero,
  ProductStorySection,
  TeacherCtaSection,
} from "./home";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState("");
  const { isAuthenticated, user } = useAuthStore();
  const authUiReady = useAuthUiReady();
  const isTeacher = Boolean(
    user?.roles.includes(UserRole.TEACHER) ||
    user?.roles.includes(UserRole.TEACHER_TRIAL),
  );

  const categoriesQuery = useQuery<CategoryResponse[]>({
    queryKey: queryKeys.categories.active,
    queryFn: categoryService.getCategoriesWithCourses,
    staleTime: STALE_TIME_CATEGORIES,
  });
  const coursesQuery = useQuery<CourseResponse[]>({
    queryKey: queryKeys.courses.topRated(0, 6),
    queryFn: async () => {
      const response = await courseService.getTopRatedCourses({
        page: 0,
        size: 6,
      });
      return response.data || [];
    },
    staleTime: STALE_TIME_COURSES_PUBLIC,
  });

  const submitSearch = () => {
    const keyword = searchKeyword.trim();
    if (keyword)
      navigate(`${USER_ROUTES.COURSES}?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <>
      <SeoMetaTags
        title="Learn with an AI Tutor Built Into Every Lesson"
        description="Discover expert-led courses, learn with a cited AI tutor, practice with generated quizzes, track progress, and earn verifiable certificates."
        canonicalUrl="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "EduMind",
          url: "https://edumind.nguyenloc.dev",
          description:
            "Online learning with contextual AI tutoring, practice tools, progress tracking, and certificates.",
        }}
      />
      <div className="min-h-screen overflow-x-hidden bg-white">
        <HomeHero
          keyword={searchKeyword}
          onKeywordChange={setSearchKeyword}
          onSearch={submitSearch}
          isAuthenticated={isAuthenticated}
          authUiReady={authUiReady}
        />
        <CategoriesStrip
          categories={categoriesQuery.data ?? []}
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
          onRetry={() => void categoriesQuery.refetch()}
        />
        <ProductStorySection />

        <section
          className="bg-white py-12 sm:py-20"
          aria-labelledby="top-courses-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col gap-2 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="max-w-2xl">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 sm:mb-2 sm:text-sm sm:tracking-[0.2em]">
                  Learn from the community
                </p>
                <h2
                  id="top-courses-heading"
                  className="text-2xl font-bold tracking-tight text-gray-950 sm:text-4xl"
                >
                  Top-rated courses
                </h2>
                <p className="mt-2 max-w-xl text-base leading-7 text-gray-600 sm:mt-3 sm:text-lg sm:leading-8">
                  Start with courses learners rate most highly, then make each
                  lesson your own.
                </p>
              </div>
              <a
                href={USER_ROUTES.COURSES}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(USER_ROUTES.COURSES);
                }}
                className="inline-flex min-h-10 w-fit items-center rounded-lg text-sm font-semibold text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-4 sm:min-h-11 sm:text-base"
              >
                View all courses{" "}
                <span aria-hidden="true" className="ml-2">
                  →
                </span>
              </a>
            </div>
            {coursesQuery.isLoading ? (
              <>
                <p className="sr-only" role="status">
                  Loading top-rated courses
                </p>
                <CourseGridSkeleton
                  count={6}
                  columns={3}
                  className="max-sm:!flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:pb-4 max-sm:[&>*]:w-[82vw] max-sm:[&>*]:flex-none max-sm:[&>*]:snap-center"
                />
              </>
            ) : coursesQuery.isError ? (
              <div
                className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-12 text-center"
                role="alert"
              >
                <p className="mb-4 text-gray-700">
                  We could not load top-rated courses.
                </p>
                <Button
                  variant="primary"
                  onClick={() => void coursesQuery.refetch()}
                  aria-label="Retry loading top-rated courses"
                >
                  Try again
                </Button>
              </div>
            ) : (
              <CourseGrid
                courses={coursesQuery.data ?? []}
                onCourseClick={(course) =>
                  navigate(
                    buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
                      courseSlug: course.slug,
                    }),
                  )
                }
                columns={3}
                ariaLabel="Top-rated courses"
                className="max-sm:!flex max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:pb-4 max-sm:[&>[role=listitem]]:w-[82vw] max-sm:[&>[role=listitem]]:flex-none max-sm:[&>[role=listitem]]:snap-center"
              />
            )}
          </div>
        </section>

        <TeacherCtaSection
          isAuthenticated={isAuthenticated}
          isTeacher={isTeacher}
          authUiReady={authUiReady}
        />
        <FinalCtaSection
          isAuthenticated={isAuthenticated}
          isTeacher={isTeacher}
          authUiReady={authUiReady}
        />
      </div>
    </>
  );
};
