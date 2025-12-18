import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Loading,
  RatingStars,
  PriceTag,
  useToast,
} from "@edumind/user-ui";
import {
  EnrollButton,
  WishlistButton,
  InstructorInfo,
  CourseStats,
  ReviewCard,
  ReviewForm,
  CurriculumAccordion,
} from "../../components/course-module";
import {
  courseService,
  enrollmentService,
  courseReviewService,
  wishlistService,
} from "@user/services/index";  
import type {
  CourseDetailResponse,
  ReviewResponse,
  InstructorStatsResponse,
} from "@edumind/shared-types";
import {
  Play,
  Clock,
  BookOpen,
  Award,
  CheckCircle,
  Users,
  Star,
  ArrowLeft,
} from "lucide-react";
import { USER_ROUTES } from "@edumind/shared-utils";
import { useAuthStore } from "@user/stores/auth.store";
import { queryKeys } from "../../lib/query-keys";
import {
  STALE_TIME_COURSE_DETAIL,
  STALE_TIME_INSTRUCTOR_STATS,
  STALE_TIME_REVIEWS,
  STALE_TIME_WISHLIST,
  STALE_TIME_ENROLLMENTS,
} from "../../lib/query-config";

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();
  const { isAuthenticated, user } = useAuthStore();
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<
    "overview" | "curriculum" | "reviews"
  >("overview");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery<CourseDetailResponse | null>({
    queryKey: queryKeys.courses.detail(courseId!),
    enabled: Boolean(courseId),
    queryFn: async () => courseService.getCourseById(Number(courseId)),
    staleTime: STALE_TIME_COURSE_DETAIL,
  });

  const instructorId = course?.instructorId;
  const { data: instructorStats } = useQuery<InstructorStatsResponse | null>({
    queryKey: queryKeys.instructors.stats(instructorId!),
    enabled: Boolean(instructorId),
    queryFn: async () =>
      courseService.getInstructorStats(instructorId as number),
    staleTime: STALE_TIME_INSTRUCTOR_STATS,
  });

  const { data: reviews = [] } = useQuery<ReviewResponse[]>({
    queryKey: queryKeys.courses.reviews(courseId!),
    enabled: Boolean(courseId),
    queryFn: async () => {
      const response = await courseReviewService.getCourseReviews(
        Number(courseId),
        {
          page: 0,
          size: 10,
        }
      );
      return response.data || [];
    },
    staleTime: STALE_TIME_REVIEWS,
  });

  // Check enrollment status (lightweight check - only returns boolean)
  const { data: isEnrolled = false } = useQuery<boolean>({
    queryKey: queryKeys.enrollments.status(Number(courseId!), userId),
    enabled: Boolean(courseId) && isAuthenticated && Boolean(userId),
    queryFn: () => enrollmentService.checkEnrollmentStatus(Number(courseId)),
    staleTime: STALE_TIME_ENROLLMENTS,
  });

  const { data: isInWishlist = false } = useQuery<boolean>({
    queryKey: queryKeys.wishlist.course(courseId!, userId),
    enabled: Boolean(courseId) && isAuthenticated && Boolean(userId),
    queryFn: () => wishlistService.isInWishlist(Number(courseId)),
    staleTime: STALE_TIME_WISHLIST,
  });

  const enrollMutation = useMutation({
    mutationFn: async (id: number) => {
      await enrollmentService.enrollInCourse(id);
      return id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.enrollments.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(id),
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
        exact: false,
      });
      showSuccess("Successfully enrolled in course!");
      navigate(USER_ROUTES.LEARNING);
    },
    onError: (err: any) => {
      showError(err?.message || "Failed to enroll in course");
    },
  });

  const wishlistMutation = useMutation({
    mutationFn: async (payload: { courseId: number; currentlyInWishlist: boolean }) => {
      if (payload.currentlyInWishlist) {
        await wishlistService.remove(payload.courseId);
      } else {
        await wishlistService.add(payload.courseId);
      }
      return payload;
    },
    onSuccess: async ({ courseId, currentlyInWishlist }) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.course(courseId, userId),
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.count(userId),
        exact: false,
      });
      showSuccess(currentlyInWishlist ? "Removed from wishlist" : "Added to wishlist");
    },
    onError: (err: any) => {
      showError(err?.message || "Failed to update wishlist");
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      await courseReviewService.createReview(Number(courseId), payload);
    },
    onSuccess: async () => {
      setShowReviewForm(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.reviews(courseId!),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(courseId!),
      });
      showSuccess("Review submitted successfully!");
    },
    onError: (err: any) => {
      showError(err?.message || "Failed to submit review");
    },
  });

  const handleEnroll = async () => {
    if (!courseId) {
      showError("Course not found");
      return;
    }
    await enrollMutation.mutateAsync(Number(courseId));
  };

  const handleToggleWishlist = async (courseId: number) => {
    if (!isAuthenticated || !userId) {
      showError("Please login to manage wishlist");
      return;
    }
    await wishlistMutation.mutateAsync({ courseId, currentlyInWishlist: Boolean(isInWishlist) });
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    await reviewMutation.mutateAsync({ rating, comment });
  };

  if (courseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-600 text-lg mb-4">
            {(courseError as any)?.message || "Course not found"}
          </p>
          <Button
            variant="primary"
            onClick={() => navigate(USER_ROUTES.COURSES)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Back Button */}
          <Button
            variant="outline"
            onClick={() => navigate(USER_ROUTES.COURSES)}
            className="mb-6 border-white text-white hover:bg-white/10 hover:text-white"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Courses
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course Info */}
            <div className="lg:col-span-2">
              {course.category && (
                <div className="mb-4">
                  <span className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full">
                    {course.category.name}
                  </span>
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {course.title}
              </h1>

              <p className="text-xl md:text-2xl text-blue-100 mb-6 leading-relaxed">
                {course.shortDescription}
              </p>

              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <RatingStars rating={course.averageRating || 0} size="md" />
                  <span className="text-lg font-semibold">
                    {course.averageRating?.toFixed(1) || "0.0"}
                  </span>
                  <span className="text-blue-200">
                    ({course.totalReviews || 0}{" "}
                    {course.totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <Users className="w-5 h-5" />
                  <span>{course.totalStudents || 0} students</span>
                </div>
                {course.durationHours && (
                  <div className="flex items-center gap-2 text-blue-100">
                    <Clock className="w-5 h-5" />
                    <span>{course.durationHours}h</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-blue-100">
                <span>Created by</span>
                <span className="font-semibold text-white">
                  {course.instructorName}
                </span>
              </div>
            </div>

            {/* Right: Course Card */}
            <div className="lg:col-span-1">
              <Card variant="elevated" className="p-6 sticky top-8 shadow-xl">
                {/* Course Thumbnail */}
                <div className="mb-6 rounded-lg overflow-hidden bg-gray-200 h-48 shadow-md">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-blue-200">
                      <Play className="w-16 h-16 text-blue-600" />
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="mb-6">
                  <PriceTag
                    price={
                      course.effectivePrice ??
                      course.discountPrice ??
                      course.price
                    }
                    originalPrice={
                      course.discountPrice ? course.price : undefined
                    }
                    size="lg"
                  />
                </div>

                {/* Enroll Button */}
                <EnrollButton
                  courseId={Number(courseId)}
                  isEnrolled={isEnrolled}
                  isFree={course.price === 0}
                  onEnroll={handleEnroll}
                  className="mb-4"
                />

                {/* Wishlist Button */}
                { !isEnrolled && 
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <WishlistButton
                      courseId={Number(courseId)}
                      isInWishlist={isInWishlist}
                      onToggle={handleToggleWishlist}
                    />
                    <span className="text-sm text-gray-600">
                      {isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    </span>
                  </div>
                }
                
                {/* Course Includes */}
                <div className="pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    This course includes:
                  </h4>
                  <ul className="space-y-3 text-sm text-gray-600">
                    {course.durationHours && (
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>
                          {course.durationHours} hours on-demand video
                        </span>
                      </li>
                    )}
                    {course.totalLessons && (
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>{course.totalLessons} lessons</span>
                      </li>
                    )}
                    {course.hasCertificate && (
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Award className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>Certificate of completion</span>
                      </li>
                    )}
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <span>Full lifetime access</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Course Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-8 bg-white rounded-t-lg">
              {(["overview", "curriculum", "reviews"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-semibold text-sm transition-all duration-200 relative ${
                    activeTab === tab
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Description */}
                <Card variant="elevated" className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    About this course
                  </h2>
                  <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed">
                    <div className="whitespace-pre-wrap">
                      {course.description}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === "curriculum" && (
              <Card variant="elevated" className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Course Curriculum
                </h2>

                {course.sections && course.sections.length > 0 ? (
                  <CurriculumAccordion
                    sections={course.sections}
                    isEnrolled={isEnrolled}
                  />
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">
                      Curriculum coming soon...
                    </p>
                  </div>
                )}
              </Card>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                {/* Review Stats */}
                <Card variant="elevated" className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">
                      Student Reviews
                    </h2>
                    {course.averageRating && (
                      <div className="flex items-center gap-2">
                        <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        <span className="text-2xl font-bold text-gray-900">
                          {course.averageRating.toFixed(1)}
                        </span>
                        <span className="text-gray-600">
                          ({course.totalReviews || 0}{" "}
                          {course.totalReviews === 1 ? "review" : "reviews"})
                        </span>
                      </div>
                    )}
                  </div>
                  <CourseStats
                    averageRating={course.averageRating ?? undefined}
                    totalStudents={course.totalStudents ?? undefined}
                  />
                </Card>

                {/* Write Review Button (only if enrolled) */}
                {isEnrolled && (
                  <Card variant="elevated" className="p-6">
                    {!showReviewForm ? (
                      <Button
                        variant="primary"
                        onClick={() => setShowReviewForm(true)}
                        className="w-full"
                        size="lg"
                      >
                        Write a Review
                      </Button>
                    ) : (
                      <ReviewForm
                        onSubmit={handleSubmitReview}
                        submitLabel="Submit Review"
                      />
                    )}
                  </Card>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length > 0 ? (
                    reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))
                  ) : (
                    <Card variant="elevated" className="p-12 text-center">
                      <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg mb-2">
                        No reviews yet.
                      </p>
                      <p className="text-gray-500">
                        Be the first to review this course!
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="lg:col-span-1">
            {/* Instructor Info */}
            <InstructorInfo
              name={
                instructorStats?.instructorName ||
                course.instructorName ||
                "Instructor"
              }
              bio={instructorStats?.bio || undefined}
              avatar={instructorStats?.avatarUrl || undefined}
              totalStudents={instructorStats?.totalStudents ?? undefined}
              totalCourses={instructorStats?.totalCourses ?? undefined}
              rating={
                typeof instructorStats?.averageRating === "number"
                  ? instructorStats.averageRating
                  : undefined
              }
              totalReviews={instructorStats?.totalReviews ?? undefined}
              className="mb-6"
            />

            {/* Course Stats */}
            <Card variant="elevated" className="p-6">
              <h3 className="font-semibold text-gray-900 mb-6 text-lg">
                Course Stats
              </h3>
              <CourseStats
                totalStudents={course.totalStudents ?? undefined}
                duration={course.durationHours ?? undefined}
                totalLessons={course.totalLessons ?? undefined}
                averageRating={course.averageRating ?? undefined}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
