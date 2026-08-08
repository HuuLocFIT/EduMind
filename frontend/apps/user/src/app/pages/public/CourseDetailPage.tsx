import React, { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  RatingStars,
  PriceTag,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToast,
  CloudinaryImage,
} from "@edumind/user-ui";
import { CourseDetailSkeleton } from "../../components/route-skeletons";
import {
  EnrollButton,
  WishlistButton,
  InstructorInfo,
  CourseStats,
  ReviewCard,
  ReviewForm,
  CurriculumAccordion,
  CourseDescriptionViewer,
} from "../../components/course-module";
import { AddToCartButton } from "../../components/payment-module";
import { courseService } from '../../services/course.service';
import { enrollmentService } from '../../services/enrollment.service';
import { courseReviewService } from '../../services/course-review.service';
import { wishlistService } from '../../services/wishlist.service';  
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
  Tag,
} from "lucide-react";
import { USER_ROUTES, stripHtml } from "@edumind/shared-utils";
import { useAuthStore } from '../../stores/auth.store';
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";
import { buildCourseJsonLd } from "../../components/Seo/course-structured-data";
import { queryKeys } from "../../lib/query-keys";
import {
  STALE_TIME_COURSE_DETAIL,
  STALE_TIME_INSTRUCTOR_STATS,
  STALE_TIME_REVIEWS,
  STALE_TIME_WISHLIST,
  STALE_TIME_ENROLLMENTS,
} from "../../lib/query-config";
import { hasPositiveCourseMetric } from "./course-detail.utils";

export const CourseDetailPage: React.FC = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
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
    queryKey: queryKeys.courses.detail(courseSlug!),
    enabled: Boolean(courseSlug),
    queryFn: async () => courseService.getCourseBySlug(courseSlug!),
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
    queryKey: queryKeys.courses.reviews(course?.id ?? 0),
    enabled: Boolean(course?.id),
    queryFn: async () => {
      const response = await courseReviewService.getCourseReviews(
        course!.id,
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
    queryKey: queryKeys.enrollments.status(course?.id ?? 0, userId),
    enabled: Boolean(course?.id) && isAuthenticated && Boolean(userId),
    queryFn: () => enrollmentService.checkEnrollmentStatus(course!.id),
    staleTime: STALE_TIME_ENROLLMENTS,
  });

  const { data: isInWishlist = false } = useQuery<boolean>({
    queryKey: queryKeys.wishlist.course(course?.id ?? 0, userId),
    enabled: Boolean(course?.id) && isAuthenticated && Boolean(userId),
    queryFn: () => wishlistService.isInWishlist(course!.id),
    staleTime: STALE_TIME_WISHLIST,
  });

  const enrollMutation = useMutation({
    mutationFn: async (id: number) => {
      await enrollmentService.enrollInCourse(id);
      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.enrollments.all,
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(courseSlug!),
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist.all,
        exact: false,
      });
      navigate(USER_ROUTES.LEARNING, {
        state: {
          notification: {
            variant: "success",
            message: "Successfully enrolled in course!",
          },
        },
      });
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
        queryKey: queryKeys.wishlist.course(course?.id ?? 0, userId),
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
      await courseReviewService.createReview(course!.id, payload);
    },
    onSuccess: async () => {
      setShowReviewForm(false);
      await queryClient.invalidateQueries({
    queryKey: queryKeys.courses.reviews(course?.id ?? 0),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(courseSlug!),
      });
      showSuccess("Review submitted successfully!");
    },
    onError: (err: any) => {
      showError(err?.message || "Failed to submit review");
    },
  });

  const handleEnroll = async () => {
    if (!course) {
      showError("Course not found");
      return;
    }
    await enrollMutation.mutateAsync(course.id);
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
      <>
        <SeoMetaTags
          key="loading"
          title="Loading Course..."
          description="Accessing course details on EduMind"
        />
        <div aria-busy="true" aria-describedby="course-loading-status">
          <p id="course-loading-status" className="sr-only" role="status">
            Loading course details
          </p>
          <CourseDetailSkeleton />
        </div>
      </>
    );
  }

  if (courseError || !course) {
    return (
      <>
        <SeoMetaTags
          key="error"
          title="Course Not Found"
          description="The requested course could not be found."
          noIndex={true}
          prerenderStatusCode={404}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="p-8 text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Course not found
            </h1>
            <p className="text-red-600 text-lg mb-4" role="alert">
              {(courseError as any)?.message || "Course not found"}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate(USER_ROUTES.COURSES)}
            >
              <ArrowLeft aria-hidden="true" focusable="false" className="w-4 h-4 mr-2" />
              Back to Courses
            </Button>
          </Card>
        </div>
      </>
    );
  }

  const canonicalPath = `/courses/${course.slug || course.id}`;

  return (
    <>
      <SeoMetaTags
        key={course.id}
        title={course.metaTitle || course.title}
        description={course.metaDescription || stripHtml(course.shortDescription) || stripHtml(course.description).substring(0, 160) || `Learn ${course.title} on EduMind`}
        canonicalUrl={canonicalPath}
        ogType="product"
        {...(course.thumbnailUrl ? { ogImage: course.thumbnailUrl } : {})}
        jsonLd={buildCourseJsonLd(course, `https://edumind.nguyenloc.dev${canonicalPath}`)}
      />
      <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section aria-label="Course overview" className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
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
          <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
            <nav aria-label="Breadcrumb">
            <Link
              to={USER_ROUTES.COURSES}
              className="group inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ArrowLeft aria-hidden="true" focusable="false" className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Courses</span>
            </Link>
            </nav>

            {course.category && (
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-2 text-sm font-medium text-white/95 backdrop-blur-sm">
                {course.category.iconUrl ? (
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 flex-shrink-0 bg-white"
                    style={{
                      WebkitMask: `url(${course.category.iconUrl}) center / contain no-repeat`,
                      mask: `url(${course.category.iconUrl}) center / contain no-repeat`,
                    }}
                  />
                ) : (
                  <Tag aria-hidden="true" focusable="false" className="w-6 h-6 text-white flex-shrink-0" />
                )}
                <span className="truncate">{course.category.name}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course Info */}
            <div className="lg:col-span-2">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {course.title}
              </h1>

              <p className="text-xl md:text-2xl text-blue-100 mb-6 leading-relaxed">
                {course.shortDescription}
              </p>

              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center gap-2" role="img" aria-label={course.averageRating
                  ? `${course.averageRating.toFixed(1)} out of 5 stars from ${course.totalReviews || 0} ${course.totalReviews === 1 ? "review" : "reviews"}`
                  : "No ratings yet"}>
                  <span aria-hidden="true"><RatingStars rating={course.averageRating || 0} size="md" /></span>
                  { course.averageRating? 
                    <span aria-hidden="true" className="text-lg font-semibold">
                      {course.averageRating?.toFixed(1) || "0.0"}
                    </span> : <span aria-hidden="true" className="text italic">No rating yet</span>
                   }
                  <span aria-hidden="true" className="text-blue-200">
                    ({course.totalReviews || 0}{" "}
                    {course.totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <Users aria-hidden="true" focusable="false" className="w-5 h-5" />
                  <span>{course.totalStudents || 0} students</span>
                </div>
                {hasPositiveCourseMetric(course.durationHours) && (
                  <div className="flex items-center gap-2 text-blue-100">
                    <Clock aria-hidden="true" focusable="false" className="w-5 h-5" />
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
                  <CloudinaryImage
                    src={course.thumbnailUrl}
                    alt={`Course thumbnail for ${course.title}`}
                    widths={[400, 800]}
                    sizes="(max-width: 768px) calc(100vw - 3rem), 384px"
                    priority={true}
                    className="w-full h-full object-cover"
                  />
                  {!course.thumbnailUrl && (
                    <div
                      className="flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-blue-200"
                      role="img"
                      aria-label={`Course thumbnail for ${course.title}`}
                    >
                      <Play aria-hidden="true" focusable="false" className="w-16 h-16 text-blue-600" />
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

                {/* Enroll Button (for free courses) */}
                {course.price === 0 && (
                  <EnrollButton
                    courseId={course.id}
                    isEnrolled={isEnrolled}
                    isFree={true}
                    onEnroll={handleEnroll}
                    className="mb-4"
                  />
                )}

                  {/* Buy Now & Add to Cart Buttons (for paid courses) */}
                {course.price > 0 && !isEnrolled && (
                  <div className="space-y-3 mb-4">
                    <Button
                      variant="primary"
                      className="w-full"
                      size="lg"
                      onClick={() => navigate(`${USER_ROUTES.CHECKOUT}?courseId=${course.id}`)}
                    >
                      Buy Now
                    </Button>
                    <AddToCartButton
                      courseId={course.id}
                      isEnrolled={isEnrolled}
                      fullWidth
                      variant="outline"
                      size="lg"
                    />
                  </div>
                )}

                {/* Already Enrolled indicator */}
                {isEnrolled && course.price > 0 && (
                  <EnrollButton
                    courseId={course.id}
                    isEnrolled={true}
                    isFree={false}
                    onEnroll={handleEnroll}
                    className="mb-4"
                  />
                )}

                {/* Wishlist Button */}
                { !isEnrolled && 
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <WishlistButton
                      courseId={course.id}
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
                  <h2 className="font-semibold text-gray-900 mb-4 text-lg">
                    This course includes:
                  </h2>
                  <ul className="space-y-3 text-sm text-gray-600">
                    {hasPositiveCourseMetric(course.durationHours) && (
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Clock aria-hidden="true" focusable="false" className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>
                          {course.durationHours} hours on-demand video
                        </span>
                      </li>
                    )}
                    {hasPositiveCourseMetric(course.totalLessons) && (
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BookOpen aria-hidden="true" focusable="false" className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>{course.totalLessons} lessons</span>
                      </li>
                    )}
                    {course.hasCertificate && (
                      <li className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Award aria-hidden="true" focusable="false" className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>Certificate of completion</span>
                      </li>
                    )}
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle aria-hidden="true" focusable="false" className="w-4 h-4 text-blue-600" />
                      </div>
                      <span>Full lifetime access</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section aria-label="Course details" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Course Content */}
          <section aria-label="Course information" className="lg:col-span-2">
            {/* Tabs */}
            <Tabs
              defaultValue="overview"
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "overview" | "curriculum" | "reviews")}
            >
              <TabsList className="mb-8 bg-white rounded-t-lg w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-6">
                  <Card variant="elevated" className="p-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6">
                      About this course
                    </h2>
                    <CourseDescriptionViewer description={course.description} />
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="curriculum">
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
                      <BookOpen aria-hidden="true" focusable="false" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">Curriculum coming soon...</p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="space-y-6">
                  <Card variant="elevated" className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-bold text-gray-900">Student Reviews</h2>
                      {course.averageRating && (
                        <div className="flex items-center gap-2">
                          <Star aria-hidden="true" focusable="false" className="w-6 h-6 text-yellow-400 fill-yellow-400" />
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
                        <ReviewForm onSubmit={handleSubmitReview} submitLabel="Submit Review" />
                      )}
                    </Card>
                  )}

                  <section className="space-y-4" aria-labelledby="review-list-heading">
                    <h3 id="review-list-heading" className="sr-only">Course review list</h3>
                    {reviews.length > 0 ? (
                      reviews.map((review) => <ReviewCard key={review.id} review={review} />)
                    ) : (
                      <Card variant="elevated" className="p-12 text-center">
                        <Star aria-hidden="true" focusable="false" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg mb-2">No reviews yet.</p>
                        <p className="text-gray-500">Be the first to review this course!</p>
                      </Card>
                    )}
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          </section>

          {/* Right: Sidebar */}
          <aside aria-label="Course sidebar" className="lg:col-span-1">
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
              <h2 className="font-semibold text-gray-900 mb-1 text-lg">
                Course Stats
              </h2>
              <CourseStats
                totalStudents={course.totalStudents ?? undefined}
                duration={course.durationHours ?? undefined}
                totalLessons={course.totalLessons ?? undefined}
                averageRating={course.averageRating ?? undefined}
              />
            </Card>
          </aside>
        </div>
      </section>
      </div>
    </>
  );
};

export default CourseDetailPage;
