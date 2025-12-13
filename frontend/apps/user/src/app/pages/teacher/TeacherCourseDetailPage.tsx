import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { teacherCourseService } from '@user/services/index';
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseStatus } from "@edumind/shared-constants";
import type {
  CourseDetailResponse,
  SectionDetailResponse,
} from "@edumind/shared-types";
import { Button, Skeleton, Alert, useToast } from "@edumind/user-ui";
import { CourseStatusBadge } from "../../components/teacher/courses/CourseStatusBadge";
import {
  OverviewTab,
  CurriculumTab,
  StudentsTab,
  ReviewsTab,
  TABS,
  type TabId,
} from "../../components/teacher/courses/detail";
import { ArrowLeft, Edit, Send } from "lucide-react";
import { queryKeys } from "../../lib/query-keys";
import { STALE_TIME_TEACHER_COURSES } from "../../lib/query-config";

export const TeacherCourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();

  const [publishing, setPublishing] = useState(false);

  const activeTab = (searchParams.get("tab") as TabId) || "overview";

  // Use React Query for caching and better performance
  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery<CourseDetailResponse>({
    queryKey: queryKeys.teacherCourses.detail(courseId!),
    queryFn: async () => {
      if (!courseId) throw new Error("Course ID is required");
      return teacherCourseService.getCourseDetail(Number(courseId));
    },
    staleTime: STALE_TIME_TEACHER_COURSES,
    enabled: Boolean(courseId),
  });

  const {
    data: sections = [],
    isLoading: sectionsLoading,
  } = useQuery<SectionDetailResponse[]>({
    queryKey: queryKeys.teacherCourses.sections(courseId!),
    queryFn: async () => {
      if (!courseId) throw new Error("Course ID is required");
      return teacherCourseService.getCourseSectionsWithLessons(Number(courseId));
    },
    staleTime: STALE_TIME_TEACHER_COURSES,
    enabled: Boolean(courseId),
  });

  const loading = courseLoading || sectionsLoading;
  const error = courseError;

  const handlePublish = async () => {
    if (!course) return;

    try {
      setPublishing(true);
      await teacherCourseService.publishCourse(course.id);
      // Invalidate and refetch course data (using prefix matching)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.teacherCourses.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        exact: false,
      })
      showSuccess("Course published successfully!");
    } catch (err: any) {
      showError(err.message || "Failed to publish course");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <Alert
        variant="error"
        title="Error"
        message={(error as any)?.message || "Course not found"}
      />
    );
  }

  const canPublish = course.status === CourseStatus.DRAFT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(TEACHER_ROUTES.COURSES)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <CourseStatusBadge status={course.status} size="md" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canPublish && (
            <Button
              variant="primary"
              onClick={handlePublish}
              isLoading={publishing}
              leftIcon={<Send className="w-4 h-4" />}
              className="bg-green-600 hover:bg-green-700"
            >
              Publish
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(TeacherRouteHelpers.courseEdit(course.id))}
            leftIcon={<Edit className="w-4 h-4" />}
          >
            Edit Course
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab course={course} />}
      {activeTab === "curriculum" && (
        <CurriculumTab
          courseId={course.id}
          sections={sections}
          onEdit={() => navigate(TeacherRouteHelpers.courseEdit(course.id, 'curriculum'))}
        />
      )}
      {activeTab === "students" && <StudentsTab courseId={course.id} />}
      {activeTab === "reviews" && <ReviewsTab courseId={course.id} />}
    </div>
  );
};

export default TeacherCourseDetailPage;