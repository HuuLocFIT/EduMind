import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, GraduationCap, Users, WalletCards } from "lucide-react";
import { TEACHER_ROUTES, USER_ROUTES } from "@edumind/shared-utils";

interface Props {
  isAuthenticated: boolean;
  isTeacher: boolean;
  authUiReady: boolean;
}
export const TeacherCtaSection: React.FC<Props> = ({
  isAuthenticated,
  isTeacher,
  authUiReady,
}) => {
  const destination = isTeacher
    ? TEACHER_ROUTES.DASHBOARD
    : isAuthenticated
      ? USER_ROUTES.TEACHER_APPLICATION
      : USER_ROUTES.SIGNUP;
  return (
    <section
      className="bg-white py-12 sm:py-20"
      aria-labelledby="teacher-cta-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-blue-50 px-5 py-8 sm:px-10 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              <span>For instructors</span>
            </div>
            <h2
              id="teacher-cta-heading"
              className="mt-4 text-2xl font-bold tracking-tight text-gray-950 sm:mt-5 sm:text-3xl"
            >
              Turn your expertise into a learning experience
            </h2>
            <p className="mt-3 text-base leading-7 text-gray-700 sm:text-lg sm:leading-8">
              Create structured courses, support students, understand
              performance, and manage earnings from one teacher workspace.
            </p>
          </div>
          <div className="mt-8 lg:mt-0 lg:w-[25rem]">
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold text-gray-700">
              <div className="rounded-xl bg-white/80 p-3">
                <Users
                  className="mx-auto mb-2 h-5 w-5 text-emerald-700"
                  aria-hidden="true"
                />
                Students
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <BarChart3
                  className="mx-auto mb-2 h-5 w-5 text-emerald-700"
                  aria-hidden="true"
                />
                Analytics
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <WalletCards
                  className="mx-auto mb-2 h-5 w-5 text-emerald-700"
                  aria-hidden="true"
                />
                Earnings
              </div>
            </div>
            {authUiReady ? (
              <Link
                to={destination}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 font-semibold text-white shadow-md hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                {isTeacher ? "Open teacher dashboard" : "Teach on EduMind"}
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
            ) : (
              <div className="invisible mt-4 min-h-12 w-full rounded-xl" aria-hidden="true" data-testid="auth-ui-skeleton" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export const FinalCtaSection: React.FC<Props> = ({
  isAuthenticated,
  isTeacher,
  authUiReady,
}) => {
  const destination = isTeacher
    ? TEACHER_ROUTES.DASHBOARD
    : isAuthenticated
      ? USER_ROUTES.LEARNING
      : USER_ROUTES.SIGNUP;
  const label = isTeacher
    ? "Go to teacher dashboard"
    : isAuthenticated
      ? "Continue learning"
      : "Create your free account";
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-indigo-900 py-12 text-white sm:py-20"
      aria-labelledby="final-cta-heading"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-300/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          id="final-cta-heading"
          className="text-2xl font-bold tracking-tight sm:text-4xl"
        >
          Your next lesson can start today
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-blue-100 sm:mt-4 sm:text-lg sm:leading-8">
          Choose a course, learn at your pace, and use the support built into
          every step.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row">
          {authUiReady ? (
            <Link
              to={destination}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 font-semibold text-blue-700 shadow-lg hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800"
            >
              {label}
            </Link>
          ) : (
            <div className="invisible min-h-12 w-full rounded-xl sm:w-52" aria-hidden="true" data-testid="auth-ui-skeleton" />
          )}
          <Link
            to={USER_ROUTES.COURSES}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 font-semibold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800"
          >
            Browse courses
          </Link>
        </div>
      </div>
    </section>
  );
};
