import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Loading,
  ProgressBar,
} from '@edumind/user-ui';
import { courseService } from '../../services/course.service';
import { enrollmentService } from '../../services/enrollment.service';
import { lessonProgressService } from '../../services/lesson-progress.service';
import { lessonService } from '../../services/lesson.service';
import { sectionService } from '../../services/section.service';
import type {
  CourseDetailResponse,
  LessonResponse,
  LessonProgressResponse,
  EnrollmentResponse,
  SectionResponse,
} from '@edumind/shared-types';
import { ContentType, EnrollmentStatus } from '@edumind/shared-constants';
import {
  Play,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Video,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';

export const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const REDIRECT_DELAY_SECONDS = 10;

  // State
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [expandedSectionIds, setExpandedSectionIds] = useState<number[]>([]);
  // All progress for this enrollment; derive per-lesson progress from here
  const [allLessonProgress, setAllLessonProgress] = useState<LessonProgressResponse[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [accessError, setAccessError] = useState<{
    title: string;
    message: string;
    redirectTo: string;
  } | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_DELAY_SECONDS);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      checkEnrollment();
    }

    return () => {
      if (progressUpdateInterval.current) {
        clearInterval(progressUpdateInterval.current);
      }
    };
  }, [courseId]);

  useEffect(() => {
    if (currentLesson && enrollment) {
      updateLastAccessedLesson();
    }
  }, [currentLesson, enrollment]);

  // By default, expand all sections when they are loaded
  useEffect(() => {
    if (!sections || sections.length === 0) return;
    setExpandedSectionIds(sections.map((s) => s.id));
  }, [sections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    if (mediaQuery.matches) {
      setSidebarOpen(true);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    }
  }, [isDesktop]);

  // Handle countdown and auto-redirect when accessError is shown
  useEffect(() => {
    if (!accessError) return;

    setRedirectCountdown(REDIRECT_DELAY_SECONDS);

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(accessError.redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [accessError, navigate]);


  const fetchCourseData = async () => {
    setLoading(true);
    try {
      // Fetch course data, sections and lessons in parallel
      const [courseData, courseSections, courseLessons] = await Promise.all([
        courseService.getCourseById(Number(courseId)),
        sectionService.getCourseSections(Number(courseId)),
        lessonService.getCourseLessons(Number(courseId)),
      ]);
      
      setCourse(courseData);
      setSections(courseSections);
      
      // Sort lessons by section order and lesson order
      const sortedLessons = courseLessons.sort((a, b) => {
        const sectionA = courseSections.find((s) => s.id === a.sectionId);
        const sectionB = courseSections.find((s) => s.id === b.sectionId);

        if (sectionA && sectionB) {
          const sectionOrderDiff = sectionA.orderIndex - sectionB.orderIndex;
          if (sectionOrderDiff !== 0) return sectionOrderDiff;
        }

        // If one of them doesn't belong to any known section, keep original orderIndex grouping
        if (!sectionA && sectionB) return 1;
        if (sectionA && !sectionB) return -1;

        // Then sort by lesson order within section
        return a.orderIndex - b.orderIndex;
      });
      
      setLessons(sortedLessons);
      
      // Set first lesson as current if available
      if (sortedLessons.length > 0) {
        setCurrentLesson(sortedLessons[0]);
      }
    } catch (err) {
      console.error('Error fetching course data:', err);
      // Set empty array if lessons fetch fails
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const isEnrolled = await enrollmentService.checkEnrollmentStatus(Number(courseId));
      if (!isEnrolled) {
        setAccessError({
          title: 'Enrollment required',
          message:
            'You must enroll in this course before accessing the content. Please go back to the course page to enroll.',
          redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
            courseId: courseId || '',
          }),
        });
        return;
      }
      
      // Get enrollment details
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      const foundEnrollment = response.data?.find(
        (e) => e.courseId === Number(courseId)
      );
      if (foundEnrollment) {
        // Business rules:
        // - DROPPED: treat as not enrolled -> redirect to course detail / purchase.
        // - SUSPENDED: student still "owns" the course but access is forbidden.
        if (foundEnrollment.status === EnrollmentStatus.DROPPED) {
          setAccessError({
            title: 'Enrollment cancelled',
            message:
              'Your enrollment for this course has been cancelled. Please purchase/enroll again to access the content.',
            redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
              courseId: courseId || '',
            }),
          });
          return;
        }

        if (foundEnrollment.status === EnrollmentStatus.SUSPENDED) {
          setAccessError({
            title: 'Access suspended',
            message:
              'Your access to this course has been suspended. Please contact your instructor or support if you believe this is a mistake.',
            redirectTo: USER_ROUTES.LEARNING,
          });
          return;
        }

        setEnrollment(foundEnrollment);
        // Load all lesson progress for this enrollment once
        try {
          const allProgress = await lessonProgressService.getEnrollmentProgress(
            foundEnrollment.id
          );
          setAllLessonProgress(allProgress);
        } catch (progressErr) {
          console.error('Error loading lesson progress:', progressErr);
          setAllLessonProgress([]);
        }
      }
    } catch (err) {
      console.error('Error checking enrollment:', err);
      setAccessError({
        title: 'Unable to load course',
        message:
          'We were unable to verify your enrollment for this course. Please try again or go back to the course page.',
        redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
          courseId: courseId || '',
        }),
      });
    }
  };

  // Helper: get progress for a specific lesson
  const getLessonProgress = (lessonId: number): LessonProgressResponse | null => {
    return allLessonProgress.find((p) => p.lessonId === lessonId) || null;
  };

  // Derived progress for the current lesson
  const currentLessonProgress: LessonProgressResponse | null =
    currentLesson ? getLessonProgress(currentLesson.id) : null;

  // When current lesson or all progress changes, sync video progress percentage
  useEffect(() => {
    if (!currentLesson) return;
    if (currentLessonProgress) {
      setVideoProgress(currentLessonProgress.watchPercentage || 0);
      } else {
      setVideoProgress(0);
    }
  }, [currentLesson, currentLessonProgress]);

  const updateLastAccessedLesson = async () => {
    if (!currentLesson || !enrollment) return;
    
    try {
      // Start lesson if not started yet
      await lessonProgressService.startLesson(enrollment.id, currentLesson.id);
    } catch (err) {
      // Lesson might already be started, that's okay
      console.log('Lesson already started or error:', err);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !currentLesson || !enrollment) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (!duration || Number.isNaN(duration)) return;

    const progress = (currentTime / duration) * 100;

    setVideoProgress(progress);

    // Auto-save progress every 10 seconds
    if (!progressUpdateInterval.current) {
      progressUpdateInterval.current = setInterval(async () => {
        if (!videoRef.current) return;
        try {
          const lastPosition = Math.floor(videoRef.current.currentTime);
          await lessonProgressService.updateWatchProgress({
            enrollmentId: enrollment.id,
            lessonId: currentLesson.id,
            lastPosition,
            watchDuration: lastPosition,
          });

          // Optimistically update local progress state for this lesson
          setAllLessonProgress((prev) => {
            const existing = prev.find((p) => p.lessonId === currentLesson.id);
            if (!existing) {
              return [
                ...prev,
                { lessonId: currentLesson.id, watchPercentage: progress, lastPosition } as LessonProgressResponse,
              ];
            }
            return prev.map((p) =>
              p.lessonId === currentLesson.id
                ? {
                    ...p,
                    watchPercentage: progress,
                    lastPosition,
                  }
                : p
            );
          });
        } catch (err) {
          console.error('Error saving progress:', err);
        }
      }, 10000);
    }
  };

  // Seek video to last watched position when metadata is loaded
  const handleVideoLoadedMetadata = () => {
    if (!videoRef.current || !currentLessonProgress) return;
    if (currentLessonProgress.lastPosition && currentLessonProgress.lastPosition > 0) {
      videoRef.current.currentTime = currentLessonProgress.lastPosition;
    }
  };

  // Fallback: if progress arrives after video metadata, still seek to lastPosition
  useEffect(() => {
    if (!videoRef.current || !currentLessonProgress) return;
    if (
      currentLessonProgress.lastPosition &&
      currentLessonProgress.lastPosition > 0 &&
      Math.floor(videoRef.current.currentTime) === 0
    ) {
      videoRef.current.currentTime = currentLessonProgress.lastPosition;
    }
  }, [currentLessonProgress]);

  const handleVideoEnded = async () => {
    if (!currentLesson || !enrollment) return;

    try {
      await lessonProgressService.completeLesson(enrollment.id, currentLesson.id);
      // Refresh all lesson progress to keep UI in sync
      try {
        const allProgress = await lessonProgressService.getEnrollmentProgress(enrollment.id);
        setAllLessonProgress(allProgress);
      } catch (progressErr) {
        console.error('Error refreshing lesson progress after completion:', progressErr);
      }
      
      // Refresh enrollment to get updated progress
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      const foundEnrollment = response.data?.find(
        (e) => e.courseId === Number(courseId)
      );
      if (foundEnrollment) {
        setEnrollment(foundEnrollment);
      }
      
      // Auto-play next lesson
      const nextLesson = getNextLesson();
      if (nextLesson) {
        setTimeout(() => {
          handleLessonClick(nextLesson);
        }, 2000);
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
    }

    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLesson || !enrollment) return;

    try {
      await lessonProgressService.completeLesson(enrollment.id, currentLesson.id);
      // Refresh all lesson progress to keep UI in sync
      try {
        const allProgress = await lessonProgressService.getEnrollmentProgress(enrollment.id);
        setAllLessonProgress(allProgress);
      } catch (progressErr) {
        console.error('Error refreshing lesson progress after manual completion:', progressErr);
      }
      
      // Refresh enrollment to get updated progress
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      const foundEnrollment = response.data?.find(
        (e) => e.courseId === Number(courseId)
      );
      if (foundEnrollment) {
        setEnrollment(foundEnrollment);
      }

      alert('Lesson marked as complete!');
    } catch (err: any) {
      alert(err?.message || 'Failed to mark lesson as complete');
    }
  };

  const handleLessonClick = (lesson: LessonResponse) => {
    // Stop current video
    if (videoRef.current) {
      videoRef.current.pause();
      // Reset position so new lesson does not inherit previous time
      videoRef.current.currentTime = 0;
    }

    // Clear progress interval
    if (progressUpdateInterval.current) {
      clearInterval(progressUpdateInterval.current);
      progressUpdateInterval.current = null;
    }

    setCurrentLesson(lesson);
    setVideoProgress(0);
  };

  const getNextLesson = (): LessonResponse | null => {
    if (!currentLesson) return null;
    const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
    return currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  };

  const getPreviousLesson = (): LessonResponse | null => {
    if (!currentLesson) return null;
    const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
    return currentIndex > 0 ? lessons[currentIndex - 1] : null;
  };

  const handleNavigate = (direction: 'next' | 'previous') => {
    const lesson = direction === 'next' ? getNextLesson() : getPreviousLesson();
    if (lesson) {
      handleLessonClick(lesson);
    }
  };

  // All lessons are always accessible; no locking by previous progress
  const isLessonLocked = (_lesson: LessonResponse): boolean => {
    return false;
  };

  // Derived data for section/lesson grouping in sidebar
  const sectionIdSet =
    sections && sections.length > 0 ? new Set(sections.map((s) => s.id)) : new Set<number>();

  const hasSectionStructure =
    sectionIdSet.size > 0 &&
    lessons.some((lesson) => lesson.sectionId && sectionIdSet.has(lesson.sectionId));

  const unsectionedLessons = lessons.filter(
    (lesson) => !lesson.sectionId || !sectionIdSet.has(lesson.sectionId)
  );

  const toggleSection = (sectionId: number) => {
    setExpandedSectionIds((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Access error modal – shown when user is DROPPED/SUSPENDED or not properly enrolled
  if (accessError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {accessError.title}
          </h2>
          <p className="text-gray-700 mb-4">{accessError.message}</p>
          <p className="text-xs text-gray-500 mb-6">
            You will be redirected automatically in{' '}
            <span className="font-semibold">{redirectCountdown}</span> seconds.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(accessError.redirectTo)}
            >
              Go Now
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Course not found</p>
          <Button variant="primary" onClick={() => navigate(USER_ROUTES.LEARNING)}>
            Back to My Learning
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => navigate(USER_ROUTES.LEARNING)}  
              className="bg-gray-700 hover:bg-gray-600"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
            <h1 className="text-white font-semibold line-clamp-1">
              {course.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Course Progress */}
            <div className="hidden md:flex items-center gap-3">
              <span className="text-gray-300 text-sm">
                Course Progress: {enrollment?.progressPercentage || 0}%
              </span>
              <div className="w-32">
                <ProgressBar
                  progress={enrollment?.progressPercentage || 0}
                  size="sm"
                  color="green"
                />
              </div>
            </div>

            {/* Mobile Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-white"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {!isDesktop && sidebarOpen && (
        <div
          className="fixed inset-x-0 bottom-0 bg-black/40 z-30 md:hidden"
          style={{ top: '57px' }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex relative">
        {/* Main Content */}
        <main className={`flex-1 ${sidebarOpen ? 'md:mr-80' : ''}`}>
          {/* Video Player */}
          <div className="bg-black aspect-video relative">
            {currentLesson.contentType === ContentType.VIDEO && currentLesson.videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={currentLesson.videoUrl}
                  className="w-full h-full"
                  controls
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                />
                
                {/* Video Overlay - Progress */}
                {/* {videoProgress > 0 && videoProgress < 100 && (
                  <div className="absolute bottom-20 left-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-white text-sm mb-2">
                        Progress: {Math.floor(videoProgress)}%
                      </p>
                      <ProgressBar progress={videoProgress} color="blue" size="sm" />
                    </div>
                  </div>
                )} */}
              </>
            ) : currentLesson.contentType === ContentType.ARTICLE ? (
              <div className="flex items-center justify-center h-full bg-gray-800">
                <FileText className="w-20 h-20 text-gray-400" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-800">
                <BookOpen className="w-20 h-20 text-gray-400" />
              </div>
            )}
          </div>

          {/* Lesson Content */}
          <div className="p-6 bg-white">
            <div className="max-w-4xl mx-auto">
              {/* Lesson Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentLesson.title}
                  </h2>
                  {currentLesson.description && (
                    <p className="text-gray-600">{currentLesson.description}</p>
                  )}
                </div>
                
                {!currentLessonProgress?.isCompleted && (
                  <Button
                    variant="primary"
                    onClick={handleMarkComplete}
                    className="flex-shrink-0"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>

              {/* Lesson Content/Resources */}
              {currentLesson.articleContent && (
                <Card className="p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Lesson Content</h3>
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentLesson.articleContent }} />
                  </div>
                </Card>
              )}

              {/* Resources */}
              {currentLesson.resources && currentLesson.resources.length > 0 && (
                <Card className="p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
                  <ul className="space-y-2">
                    {currentLesson.resources.map((resource, index: number) => (
                      <li key={index}>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {resource.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  onClick={() => handleNavigate('previous')}
                  disabled={!getPreviousLesson()}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Lesson
                </Button>

                <Button
                  variant="primary"
                  onClick={() => handleNavigate('next')}
                  disabled={!getNextLesson()}
                >
                  Next Lesson
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar - Course Curriculum */}
        <aside
          className={`
            fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-200 
            transform transition-transform duration-200 z-40
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
            md:translate-x-0
          `}
          style={{ top: '57px' }} // Height of header
        >
          <div className="h-full overflow-y-auto">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Course Content</h3>
              <p className="text-sm text-gray-600 mt-1">
                {enrollment?.completedLessons || 0} / {lessons.length} lessons completed
              </p>
            </div>

            <div className="p-2 space-y-4">
              {hasSectionStructure && sections && sections.length > 0 && (
                <>
                  {sections
                    .slice()
                    .sort((a, b) => a.orderIndex - b.orderIndex)
                    .map((section) => {
                      const sectionLessons = lessons.filter(
                        (lesson) => lesson.sectionId === section.id
                      );
                      if (sectionLessons.length === 0) return null;

                      const isExpanded = expandedSectionIds.includes(section.id);

                      return (
                        <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                                {section.title}
                              </span>
                              {section.lessonCount !== undefined && (
                                <span className="text-[11px] text-gray-500">
                                  {section.lessonCount} lessons
                                  {section.totalDurationMinutes
                                    ? ` • ${section.totalDurationMinutes} min`
                                    : ''}
                                </span>
                              )}
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-gray-600 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="mt-1 px-1 pb-2 pt-1">
                              {sectionLessons.map((lesson) => {
                                const isActive = currentLesson?.id === lesson.id;
                                const isLocked = isLessonLocked(lesson); // currently always false – lessons are never locked
                                const lessonProgress = getLessonProgress(lesson.id);
                                const isCompleted = lessonProgress?.isCompleted;
                                const globalIndex =
                                  lessons.findIndex((l) => l.id === lesson.id) + 1;

                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => handleLessonClick(lesson)}
                                    className={`
                                      w-full text-left p-3 rounded-lg mb-1 transition-colors
                                      ${isActive ? 'bg-blue-50 border-2 border-blue-600' : 'hover:bg-gray-50'}
                                      cursor-pointer
                                    `}
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Lesson Number/Status */}
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                        {isCompleted ? (
                                          <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : isActive ? (
                                          <Play className="w-4 h-4 text-blue-600" />
                                        ) : (
                                          <span className="text-sm font-medium text-gray-600">
                                            {globalIndex}
                                          </span>
                                        )}
                                      </div>

                                      {/* Lesson Info */}
                                      <div className="flex-1 min-w-0">
                                        <h4
                                          className={`font-medium text-sm line-clamp-2 ${
                                            isActive ? 'text-blue-600' : 'text-gray-900'
                                          }`}
                                        >
                                          {lesson.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                          {lesson.contentType === ContentType.VIDEO && (
                                            <>
                                              <Video className="w-3 h-3" />
                                              <span>
                                                {lesson.videoDuration
                                                  ? Math.round(lesson.videoDuration / 60)
                                                  : 0}{' '}
                                                min
                                              </span>
                                            </>
                                          )}
                                          {lesson.contentType === ContentType.ARTICLE && (
                                            <>
                                              <FileText className="w-3 h-3" />
                                              <span>Reading</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Progress bar for current lesson */}
                                    {isActive && videoProgress > 0 && videoProgress < 100 && (
                                      <div className="mt-2">
                                        <ProgressBar
                                          progress={videoProgress}
                                          size="sm"
                                          color="blue"
                                        />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoursePlayerPage;