import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { useTeacherApplication } from "../hooks/useTeacherApplication";
import {
  GraduationCap,
  ArrowRight,
  Clock,
  XCircle,
  X,
  Sparkles,
} from "lucide-react";
import { UserRole } from "@edumind/shared-constants";
import { USER_ROUTES, formatDate } from "@edumind/shared-utils";

export const TeacherApplicationBanner: React.FC = () => {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = useState(false);

  const isStudent = user?.roles.includes(UserRole.STUDENT);
  const isTeacher =
    user?.roles.includes(UserRole.TEACHER) ||
    user?.roles.includes(UserRole.TEACHER_TRIAL);

  const { data: application, isLoading, isError } = useTeacherApplication();

  // Teachers can retain the student role after approval, so teacher access must
  // take precedence over the student-role and application-cache checks.
  if (!isStudent || isTeacher || dismissed || isLoading || isError) return null;

  // If approved, don't show banner (they're now a teacher)
  if (application?.status === "APPROVED") return null;

  // ========================================
  // CASE 1: No application - Promotional Banner
  // ========================================
  if (!application) {
    return (
      <div className="relative mb-6 flex min-h-[176px] items-center overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 text-white shadow-sm sm:min-h-[126px] sm:p-5 sm:pr-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          aria-label="Dismiss teacher application banner"
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-3 rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 sm:hidden">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/15 sm:h-12 sm:w-12">
              <GraduationCap className="h-5 w-5 text-white sm:h-6 sm:w-6" />
            </div>
            <div className="flex min-h-10 min-w-0 items-center gap-2 pr-10">
              <h3 className="font-bold">Become a Teacher</h3>
              <Sparkles className="h-4 w-4 flex-none text-yellow-300" />
            </div>
            <p className="col-span-2 max-w-2xl text-sm leading-5 text-white/80">
              Share what you know, create courses, and earn while helping other
              learners grow.
            </p>
          </div>
          <div className="hidden min-w-0 items-start gap-3 sm:flex">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/15">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-bold">Become a Teacher</h3>
                <Sparkles className="h-4 w-4 flex-none text-yellow-300" />
              </div>
              <p className="max-w-2xl text-sm leading-5 text-white/80">
                Share what you know, create courses, and earn while helping
                other learners grow.
              </p>
            </div>
          </div>

          <Link
            to={USER_ROUTES.TEACHER_APPLICATION}
            className="inline-flex w-auto flex-none items-center justify-center gap-2 self-center whitespace-nowrap rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 sm:self-auto"
          >
            Apply Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  // ========================================
  // CASE 2: Has application - Status Banner
  // ========================================
  const statusConfig = {
    PENDING: {
      icon: Clock,
      bg: "bg-yellow-50 border-yellow-200",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      title: "Application Pending",
      description:
        "Your teacher application has been submitted and is waiting for review.",
      badgeClass: "bg-yellow-100 text-yellow-800",
      ctaLabel: "View Details",
      ctaTo: USER_ROUTES.TEACHER_APPLICATION_STATUS,
    },
    REJECTED: {
      icon: XCircle,
      bg: "bg-red-50 border-red-200",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      title: "Application Not Approved",
      description:
        application.rejectionReason ||
        "Unfortunately, your application was not approved. You can reapply after addressing the feedback.",
      badgeClass: "bg-red-100 text-red-800",
      ctaLabel: "Apply Again",
      ctaTo: USER_ROUTES.TEACHER_APPLICATION,
    },
  };

  const status = application.status as keyof typeof statusConfig;
  const config = statusConfig[status];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`relative mb-6 flex min-h-[176px] items-center overflow-hidden rounded-2xl border p-4 shadow-sm sm:min-h-[126px] sm:p-5 sm:pr-20 ${config.bg}`}
    >
      {/* Dismiss Button */}
      <button
        type="button"
        aria-label="Dismiss teacher application status"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 rounded-lg p-2 text-gray-400 transition-colors hover:bg-black/5 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 sm:hidden">
          <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.iconBg}`}
            >
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 pr-10">
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
              >
                {application.status}
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-5 text-gray-600">
            {config.description}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            {application.createdAt && (
              <p className="text-xs text-gray-500">
                Submitted: {formatDate(application.createdAt)}
              </p>
            )}
            <Link
              to={config.ctaTo}
              className="ml-auto inline-flex flex-none items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
            >
              {config.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {status === "REJECTED" && (
            <div className="mt-1 flex justify-end">
              <Link
                to={USER_ROUTES.TEACHER_APPLICATION_STATUS}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                View details
              </Link>
            </div>
          )}
        </div>
        <div className="hidden min-w-0 items-start gap-3 sm:flex">
          <div
            className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl ${config.iconBg}`}
          >
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
              >
                {application.status}
              </span>
            </div>
            <p className="max-w-2xl text-sm leading-5 text-gray-600">
              {config.description}
            </p>
            {application.createdAt && (
              <p className="mt-1 text-xs text-gray-500">
                Submitted: {formatDate(application.createdAt)}
              </p>
            )}
          </div>
        </div>

        <div className="hidden flex-none flex-col items-end gap-1.5 sm:flex">
          <Link
            to={config.ctaTo}
            className="inline-flex w-auto flex-none items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {config.ctaLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
          {status === "REJECTED" && (
            <Link
              to={USER_ROUTES.TEACHER_APPLICATION_STATUS}
              className="text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              View details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherApplicationBanner;
