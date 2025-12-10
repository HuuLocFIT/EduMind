import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { teacherCourseService } from "../../services/teacher-course.service";
import { TEACHER_ROUTES, TeacherRouteHelpers } from "@edumind/shared-utils";
import { CourseStatus } from "@edumind/shared-constants";
import type {
  CourseDetailResponse,
  SectionDetailResponse,
  EnrollmentResponse,
  ReviewResponse,
} from "@edumind/shared-types";
import {
  Button,
  Skeleton,
  Alert,
  useToast,
  RatingStars,
  ProgressBar,
} from "@edumind/user-ui";
import { CourseStatusBadge } from "../../components/teacher/courses/CourseStatusBadge";
import {
  ArrowLeft,
  Edit,
  Send,
  BookOpen,
  Users,
  Star,
  Clock,
  DollarSign,
  BarChart3,
  Play,
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type TabId = "overview" | "curriculum" | "students" | "reviews";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "curriculum", label: "Curriculum", icon: <BookOpen className="w-4 h-4" /> },
  { id: "students", label: "Students", icon: <Users className="w-4 h-4" /> },
  { id: "reviews", label: "Reviews", icon: <Star className="w-4 h-4" /> },
];

// ============================================================================
// TAB COMPONENTS
// ============================================================================

const OverviewTab: React.FC<{ course: CourseDetailResponse }> = ({ course }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">Students</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.totalStudents ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Star className="w-4 h-4" />
            <span className="text-sm">Rating</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.averageRating?.toFixed(1) ?? "0"}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Lessons</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.totalLessons ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Duration</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {course.durationHours ?? 0}h
          </p>
        </div>
      </div>

      {/* Course Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-600 whitespace-pre-wrap">
              {course.description}
            </p>
          </div>

          {/* Short Description */}
          {course.shortDescription && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Short Description
              </h3>
              <p className="text-gray-600">{course.shortDescription}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-gray-300" />
              </div>
            )}
          </div>

          {/* Course Details */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <CourseStatusBadge status={course.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Category</span>
              <span className="font-medium">{course.category?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Level</span>
              <span className="font-medium">{course.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Language</span>
              <span className="font-medium">{course.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price</span>
              <span className="font-medium">
                {course.price === 0
                  ? "Free"
                  : `${course.currency} ${course.effectivePrice ?? course.price}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Certificate</span>
              <span className="font-medium">
                {course.hasCertificate ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CurriculumTab: React.FC<{
  courseId: number;
  sections: SectionDetailResponse[];
  onEdit: () => void;
}> = ({ courseId, sections, onEdit }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((s) => s.id))
  );

  const toggleSection = (sectionId: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No curriculum yet
        </h3>
        <p className="text-gray-600 mb-4">
          Start building your course content
        </p>
        <Button
          variant="primary"
          onClick={onEdit}
          className="bg-green-600 hover:bg-green-700"
        >
          Add Content
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {sections.length} sections •{" "}
          {sections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0)} lessons
        </p>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Curriculum
        </Button>
      </div>

      {sections.map((section) => (
        <div key={section.id} className="bg-white rounded-lg border overflow-hidden">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
              <div className="text-left">
                <h4 className="font-medium text-gray-900">{section.title}</h4>
                <p className="text-sm text-gray-500">
                  {section.lessons?.length || 0} lessons
                </p>
              </div>
            </div>
          </button>

          {expandedSections.has(section.id) && section.lessons && (
            <div className="border-t divide-y">
              {section.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 px-4 py-3 pl-12"
                >
                  {lesson.contentType === "VIDEO" ? (
                    <Play className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-gray-900">{lesson.title}</p>
                    {lesson.videoDuration && (
                      <p className="text-sm text-gray-500">
                        {Math.floor(lesson.videoDuration / 60)}:
                        {String(lesson.videoDuration % 60).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                  {lesson.isPreview && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Preview
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const StudentsTab: React.FC<{ courseId: number }> = ({ courseId }) => {
  const [students, setStudents] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherCourseService
      .getCourseStudents(courseId, { page: 0, size: 20 })
      .then((res) => setStudents(res.data || []))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No students yet
        </h3>
        <p className="text-gray-600">
          Students will appear here once they enroll
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((enrollment) => (
        <div
          key={enrollment.id}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border"
        >
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              Student #{enrollment.studentId}
            </p>
            <p className="text-sm text-gray-500">
              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">
              {enrollment.progressPercentage ?? 0}%
            </p>
            <ProgressBar
              progress={enrollment.progressPercentage ?? 0}
              size="sm"
              className="w-24"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const ReviewsTab: React.FC<{ courseId: number }> = ({ courseId }) => {
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherCourseService
      .getCourseReviews(courseId, { page: 0, size: 20 })
      .then((res) => setReviews(res.data || []))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No reviews yet
        </h3>
        <p className="text-gray-600">
          Reviews will appear here once students leave feedback
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {review.avatarUrl ? (
                <img
                  src={review.avatarUrl}
                  alt={review.studentName}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <span className="text-gray-500 font-medium">
                  {review.studentName?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{review.studentName}</p>
              <div className="flex items-center gap-2">
                <RatingStars rating={review.rating} size="sm" />
                <span className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <p className="text-gray-600">{review.comment}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TeacherCourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: showSuccess, error: showError, showToast } = useToast();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [sections, setSections] = useState<SectionDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const activeTab = (searchParams.get("tab") as TabId) || "overview";

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;

      try {
        setLoading(true);
        const [courseData, sectionsData] = await Promise.all([
          teacherCourseService.getCourseDetail(Number(courseId)),
          teacherCourseService.getCourseSectionsWithLessons(Number(courseId)),
        ]);
        setCourse(courseData);
        setSections(sectionsData);
      } catch (err: any) {
        setError(err.message || "Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handlePublish = async () => {
    if (!course) return;

    try {
      setPublishing(true);
      await teacherCourseService.publishCourse(course.id);
      setCourse((prev) =>
        prev ? { ...prev, status: CourseStatus.PUBLISHED } : prev
      );
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
        message={error || "Course not found"}
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
          onEdit={() => navigate(TeacherRouteHelpers.courseEdit(course.id))}
        />
      )}
      {activeTab === "students" && <StudentsTab courseId={course.id} />}
      {activeTab === "reviews" && <ReviewsTab courseId={course.id} />}
    </div>
  );
};

export default TeacherCourseDetailPage;