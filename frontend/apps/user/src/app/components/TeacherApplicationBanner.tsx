import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { useQuery, useIsFetching } from "@tanstack/react-query";
import { queryKeys } from "../lib/query-keys";
import { teacherApplicationService } from "../services/teacher-application.service";
import {
  GraduationCap,
  ArrowRight,
  Clock,
  CheckCircle,
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

  // Read from cache only — MainLayout is the sole fetcher for this query.
  // enabled: false means this observer never triggers a network request.
  const { data: application } = useQuery({
    queryKey: queryKeys.teacherApplication.myApplication(user?.id),
    queryFn: () => teacherApplicationService.getMyApplication(),
    enabled: false,
    staleTime: 5 * 60 * 1000,
  });

  // Track whether MainLayout's fetch is still in-flight
  const isFetchingApplication =
    useIsFetching({ queryKey: queryKeys.teacherApplication.myApplication(user?.id) }) > 0;

  // Don't render for non-students, dismissed, or while loading
  if (!isStudent || dismissed || isFetchingApplication) return null;

  // If approved, don't show banner (they're now a teacher)
  if (application?.status === "APPROVED") return null;

  // ========================================
  // CASE 1: No application - Promotional Banner
  // ========================================
  if (!application) {
    return (
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 mb-6 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="text-white">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">Become a Teacher</h3>
                <Sparkles className="w-5 h-5 text-yellow-300" />
              </div>
              <p className="text-white/80 max-w-md">
                Share your knowledge with thousands of students. Earn money
                while teaching what you love.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  Create and sell your own courses
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  Earn up to 70% revenue share
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  Access teaching tools & analytics
                </li>
              </ul>
            </div>
          </div>

          <Link
            to={USER_ROUTES.TEACHER_APPLICATION}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg whitespace-nowrap"
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
    },
  };

  const status = application.status as keyof typeof statusConfig;
  const config = statusConfig[status];

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`relative border rounded-xl p-5 mb-6 ${config.bg}`}>
      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${config.iconBg}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold text-gray-900">{config.title}</h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${config.badgeClass}`}
              >
                {application.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 max-w-lg">
              {config.description}
            </p>
            {application.createdAt && (
              <p className="text-xs text-gray-500 mt-2">
                Submitted:{" "}
                {formatDate(application.createdAt)}
              </p>
            )}
          </div>
        </div>

        <Link
          to={USER_ROUTES.TEACHER_APPLICATION_STATUS}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default TeacherApplicationBanner;
