import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Loading,
  RatingStars,
  PriceTag,
} from '@edumind/user-ui';
import {
  EnrollButton,
  WishlistButton,
  InstructorInfo,
  CourseStats,
  ReviewCard,
  ReviewForm,
} from '../components/course-module';
import {
  courseService,
  enrollmentService,
  courseReviewService,
  wishlistService,
} from '../services';
import type {
  CourseDetailResponse,
  ReviewResponse,
  EnrollmentResponse,
} from '@edumind/shared-types';
import {
  Play,
  Clock,
  BookOpen,
  Award,
  CheckCircle,
  Lock,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // State
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [reviews, setReviews] = useState<ReviewResponse[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetail();
      checkEnrollmentStatus();
      checkWishlistStatus();
      fetchReviews();
    }
  }, [courseId]);

  const fetchCourseDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await courseService.getCourseById(Number(courseId));
      setCourse(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch course details');
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    try {
      const isEnrolled = await enrollmentService.checkEnrollmentStatus(Number(courseId));
      if (isEnrolled) {
        // Get enrollment from my enrollments list
        const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
        const foundEnrollment = response.data?.find(
          (e) => e.courseId === Number(courseId)
        );
        if (foundEnrollment) {
          setEnrollment(foundEnrollment);
        }
      }
    } catch (err) {
      // User not enrolled or not authenticated
      console.log('Not enrolled');
    }
  };

  const checkWishlistStatus = async () => {
    try {
      const inWishlist = await wishlistService.isInWishlist(Number(courseId));
      setIsInWishlist(inWishlist);
    } catch (err) {
      console.log('Error checking wishlist');
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await courseReviewService.getCourseReviews(Number(courseId), {
        page: 0,
        size: 10,
      });
      setReviews(response.content || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const handleEnroll = async () => {
    try {
      await enrollmentService.enrollInCourse(Number(courseId));
      await checkEnrollmentStatus();
      // Show success message or redirect
      navigate('/my-learning');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to enroll in course');
    }
  };

  const handleToggleWishlist = async (courseId: number) => {
    try {
      if (isInWishlist) {
        await wishlistService.remove(courseId);
        setIsInWishlist(false);
      } else {
        await wishlistService.add(courseId);
        setIsInWishlist(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update wishlist');
    }
  };

  const handleSubmitReview = async (rating: number, comment: string) => {
    try {
      await courseReviewService.createReview(Number(courseId), { rating, comment });
      setShowReviewForm(false);
      fetchReviews();
      alert('Review submitted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || 'Course not found'}</p>
          <Button variant="primary" onClick={() => navigate('/courses')}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Course Info */}
            <div className="lg:col-span-2">
              {course.category && (
                <div className="mb-4">
                  <span className="bg-blue-500 text-white text-sm px-3 py-1 rounded-full">
                    {course.category.name}
                  </span>
                </div>
              )}
              
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              
              <p className="text-xl text-blue-100 mb-6">{course.shortDescription}</p>

              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <RatingStars rating={course.averageRating || 0} size="md" />
                  <span className="text-lg">
                    {course.averageRating?.toFixed(1)} ({course.totalReviews} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{course.totalStudents || 0} students</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-blue-100">
                <span>Created by</span>
                <span className="font-semibold">{course.instructorName}</span>
              </div>
            </div>

            {/* Right: Course Card */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-8">
                {/* Course Thumbnail */}
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-48">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Play className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <PriceTag
                    price={course.effectivePrice ?? course.discountPrice ?? course.price}
                    originalPrice={course.discountPrice ? course.price : undefined}
                    size="lg"
                  />
                </div>

                {/* Enroll Button */}
                <EnrollButton
                  courseId={Number(courseId)}
                  isEnrolled={!!enrollment}
                  isFree={course.price === 0}
                  onEnroll={handleEnroll}
                  className="mb-3"
                />

                {/* Wishlist Button */}
                <div className="flex items-center justify-center">
                  <WishlistButton
                    courseId={Number(courseId)}
                    isInWishlist={isInWishlist}
                    onToggle={handleToggleWishlist}
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  </span>
                </div>

                {/* Course Includes */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    This course includes:
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {course.durationHours && (
                      <li className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {course.durationHours} hours on-demand video
                      </li>
                    )}
                    {course.totalLessons && (
                      <li className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {course.totalLessons} lessons
                      </li>
                    )}
                    {course.hasCertificate && (
                      <li className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Certificate of completion
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Full lifetime access
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Course Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-4 border-b mb-6">
              {(['overview', 'curriculum', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-2 font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Description */}
                <Card className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    About this course
                  </h2>
                  <div className="prose max-w-none text-gray-700">
                    {course.description}
                  </div>
                </Card>

              </div>
            )}

            {activeTab === 'curriculum' && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Course Curriculum
                </h2>
                <div className="space-y-4">
                  {course.sections && course.sections.length > 0 ? (
                    course.sections.map((section, sectionIndex) => (
                      <div
                        key={section.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500 font-medium">
                            {sectionIndex + 1}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {section.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {section.lessonCount} lessons
                              {section.totalDurationMinutes > 0 &&
                                ` • ${Math.round(section.totalDurationMinutes / 60)}h`}
                            </p>
                          </div>
                        </div>
                        {enrollment ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">Curriculum coming soon...</p>
                  )}
                </div>
              </Card>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Review Stats */}
                <Card className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Student Reviews
                  </h2>
                  <CourseStats
                    averageRating={course.averageRating ?? undefined}
                    totalStudents={course.totalStudents ?? undefined}
                    className="mb-4"
                  />
                </Card>

                {/* Write Review Button (only if enrolled) */}
                {enrollment && (
                  <Card className="p-6">
                    {!showReviewForm ? (
                      <Button
                        variant="primary"
                        onClick={() => setShowReviewForm(true)}
                        className="w-full"
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
                    <Card className="p-6 text-center">
                      <p className="text-gray-600">No reviews yet. Be the first to review!</p>
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
              name={course.instructorName || 'Instructor'}
              className="mb-6"
            />

            {/* Course Stats */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Course Stats</h3>
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