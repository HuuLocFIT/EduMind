import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { categoryService } from '../../services/category.service';
import { teacherCourseService } from '../../services/teacher-course.service';
import { TeacherRouteHelpers } from "@edumind/shared-utils";
import type {
  CourseDetailResponse,
  UpdateCourseRequest,
  CategoryResponse,
  SectionDetailResponse,
} from "@edumind/shared-types";
import { Alert, Skeleton, useToast } from "@edumind/user-ui";
import { CourseStatusBadge } from "../../components/teacher/courses/CourseStatusBadge";
import { TeacherCourseEditSkeleton } from "../../components/route-skeletons";
import {
  BasicInfoTab,
  PricingTab,
  SettingsTab,
  CurriculumTab,
  TABS,
  type TabId,
} from "../../components/teacher/courses/edit";
import { ArrowLeft } from "lucide-react";

export const TeacherCourseEditPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [sections, setSections] = useState<SectionDetailResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isInitialLoad = useRef(true);

  const activeTab = (searchParams.get("tab") as TabId) || "basic";

  const fetchData = useCallback(async () => {
    if (!courseId) return;

    try {
      if (isInitialLoad.current) setLoading(true);
      const [courseData, sectionsData, categoriesData] = await Promise.all([
        teacherCourseService.getCourseDetail(Number(courseId)),
        teacherCourseService.getCourseSectionsWithLessons(Number(courseId)),
        categoryService.getActiveCategories(),
      ]);
      setCourse(courseData);
      setSections(sectionsData);
      setCategories(categoriesData);
      isInitialLoad.current = false;
    } catch (err: any) {
      showError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [courseId, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (data: Partial<UpdateCourseRequest>) => {
    if (!course) return;

    try {
      setSaving(true);
      const updated = await teacherCourseService.updateCourse(course.id, data);
      setCourse((prev) => (prev ? { ...prev, ...updated } : prev));
      showSuccess("Course updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <TeacherCourseEditSkeleton />;
  }

  if (!course) {
    return <Alert variant="error" title="Error" message="Course not found" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(TeacherRouteHelpers.courseDetail(course.id))}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
            <CourseStatusBadge status={course.status} />
          </div>
          <p className="text-gray-600 mt-1 truncate max-w-xl">{course.title}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b px-4">
          <div className="flex gap-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-colors whitespace-nowrap ${
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

        <div className="p-6">
          {activeTab === "basic" && (
            <BasicInfoTab course={course} categories={categories} onSave={handleSave} saving={saving} />
          )}
          {activeTab === "curriculum" && (
            <CurriculumTab courseId={course.id} sections={sections} onRefresh={fetchData} />
          )}
          {activeTab === "pricing" && <PricingTab course={course} onSave={handleSave} saving={saving} />}
          {activeTab === "settings" && <SettingsTab course={course} onSave={handleSave} saving={saving} />}
        </div>
      </div>
    </div>
  );
};

export default TeacherCourseEditPage;