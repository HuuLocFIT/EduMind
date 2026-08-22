import React from "react";
import { Link } from "react-router-dom";
import { BookOpen, Bot, CheckCircle2, Play, Sparkles } from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { PublicCourseSearch } from "../components/PublicCourseSearch";

interface Props {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  isAuthenticated: boolean;
  authUiReady: boolean;
}

export const HomeHero: React.FC<Props> = ({
  keyword,
  onKeywordChange,
  onSearch,
  isAuthenticated,
  authUiReady,
}) => (
  <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-900 text-white">
    <div className="absolute inset-0" aria-hidden="true">
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
    </div>
    <div className="relative mx-auto grid max-w-7xl items-center gap-9 px-4 py-12 sm:gap-12 sm:px-6 sm:py-20 md:grid-cols-[0.9fr_1.1fr] md:gap-8 md:py-16 lg:px-8 lg:py-20 xl:grid-cols-[1.02fr_0.98fr] xl:gap-12 xl:py-24">
      <div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-50 backdrop-blur-sm sm:mb-6 sm:text-sm">
          <Sparkles className="h-4 w-4 text-amber-300" aria-hidden="true" /> AI
          support grounded in your lesson
        </div>
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-4xl lg:text-5xl xl:text-6xl">
          Learn deeply. Move forward with confidence.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-blue-100 sm:mt-6 sm:text-xl sm:leading-8">
          Discover expert-led courses, ask questions with context, practice what
          you learn, and keep every milestone in view.
        </p>
        <PublicCourseSearch
          id="home-course-search"
          value={keyword}
          onInputChange={onKeywordChange}
          onSubmit={onSearch}
          inputLabel="What do you want to learn?"
          submitLabel="Search courses"
          className="mt-6 max-w-xl sm:mt-8"
        />
        <div className="mt-5 flex w-full max-w-xl flex-row items-center gap-2 sm:mt-6 sm:gap-3">
          <Link
            to={USER_ROUTES.COURSES}
            className="group inline-flex min-h-12 min-w-0 flex-[1.08] items-center justify-center whitespace-nowrap rounded-xl bg-white px-2.5 text-center text-[13px] font-semibold text-blue-700 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800 sm:px-6 sm:text-base xl:flex-none"
          >
            Explore courses{" "}
            <span
              className="ml-1.5 transition-transform group-hover:translate-x-0.5 sm:ml-2"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
          {authUiReady ? (
            <Link
              to={isAuthenticated ? USER_ROUTES.DASHBOARD : USER_ROUTES.SIGNUP}
              className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-white/30 bg-white/5 px-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800 sm:px-6 sm:text-base xl:flex-none"
            >
              {isAuthenticated ? "Go to dashboard" : "Start learning"}
            </Link>
          ) : (
            <div
              className="invisible min-h-12 min-w-0 flex-1 rounded-xl sm:px-6 xl:w-44 xl:flex-none"
              aria-hidden="true"
              data-testid="auth-ui-skeleton"
            />
          )}
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-2xl lg:max-w-none"
        aria-hidden="true"
      >
        <div className="rounded-[1.75rem] border border-white/20 bg-white/10 p-2 shadow-2xl backdrop-blur-sm sm:p-3">
          <div className="overflow-hidden rounded-2xl bg-gray-950 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              <span className="ml-2 text-xs font-medium text-gray-400">
                Course player
              </span>
            </div>
            <div className="grid min-h-[390px] xl:grid-cols-[0.64fr_0.36fr]">
              <div className="flex flex-col border-gray-800 xl:border-r">
                <div className="relative flex min-h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 sm:min-h-56">
                  <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10 shadow-xl sm:h-16 sm:w-16">
                    <Play className="ml-1 h-6 w-6 fill-white text-white sm:h-7 sm:w-7" />
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                        Design systems · Lesson 4
                      </p>
                      <p className="mt-1 font-semibold text-white">
                        Building accessible components
                      </p>
                    </div>
                    <span className="rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-300">
                      68%
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full w-2/3 rounded-full bg-blue-500" />
                  </div>
                  <div className="mt-5 rounded-xl border border-gray-800 bg-gray-900 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Bot className="h-4 w-4 text-blue-400" /> EduMind AI
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-300">
                      A focus indicator makes keyboard navigation visible. Keep
                      it distinct and ensure sufficient contrast.
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-blue-300">
                      <BookOpen className="h-3 w-3" /> Source: Lesson 4 · Focus
                      states
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden bg-gray-900 p-4 xl:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Course content
                </p>
                {[
                  ["Foundations", true],
                  ["Design tokens", true],
                  ["Component anatomy", true],
                  ["Accessible components", false],
                  ["Knowledge check", false],
                ].map(([label, complete], index) => (
                  <div
                    key={String(label)}
                    className={`mt-3 flex items-center gap-2 rounded-lg p-2 text-xs ${index === 3 ? "bg-blue-500/15 text-blue-200" : "text-gray-400"}`}
                  >
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-gray-600" />
                    )}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
