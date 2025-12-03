import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Loading,
  ProgressBar,
} from '@edumind/user-ui';
import {
  courseService,
  enrollmentService,
  lessonProgressService,
  lessonService,
} from '@user/services/index';
import type {
  CourseDetailResponse,
  LessonResponse,
  LessonProgressResponse,
  EnrollmentResponse,
} from '@edumind/shared-types';
import { ContentType } from '@edumind/shared-constants';
import {
  Play,
  CheckCircle,
  Lock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Video,
  Menu,
  X,
} from 'lucide-react';

export const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // State
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonResponse | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressResponse | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

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
      fetchLessonProgress();
      updateLastAccessedLesson();
    }
  }, [currentLesson, enrollment]);


  const fetchCourseData = async () => {
    setLoading(true);
    try {
      // Fetch course data and lessons in parallel
      const [courseData, courseLessons] = await Promise.all([
        courseService.getCourseById(Number(courseId)),
        lessonService.getCourseLessons(Number(courseId)),
      ]);
      
      setCourse(courseData);
      
      // Sort lessons by section order and lesson order
      const sortedLessons = courseLessons.sort((a, b) => {
        // First sort by section order (if available in course sections)
        const sectionA = courseData.sections?.find(s => s.id === a.sectionId);
        const sectionB = courseData.sections?.find(s => s.id === b.sectionId);
        
        if (sectionA && sectionB) {
          const sectionOrderDiff = sectionA.orderIndex - sectionB.orderIndex;
          if (sectionOrderDiff !== 0) return sectionOrderDiff;
        }
        
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
        alert('You must enroll in this course first');
        navigate(`/courses/${courseId}`);
        return;
      }
      
      // Get enrollment details
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      const foundEnrollment = response.data?.find(
        (e) => e.courseId === Number(courseId)
      );
      if (foundEnrollment) {
        setEnrollment(foundEnrollment);
      }
    } catch (err) {
      console.error('Error checking enrollment:', err);
      navigate(`/courses/${courseId}`);
    }
  };

  const fetchLessonProgress = async () => {
    if (!currentLesson || !enrollment) return;
    
    try {
      // Get all progress for enrollment to find this lesson's progress
      const allProgress = await lessonProgressService.getEnrollmentProgress(enrollment.id);
      const progress = allProgress.find(p => p.lessonId === currentLesson.id);
      
      if (progress) {
        setLessonProgress(progress);
        setVideoProgress(progress.watchPercentage || 0);
      } else {
        setLessonProgress(null);
        setVideoProgress(0);
      }
    } catch (err) {
      console.log('No progress yet for this lesson');
      setLessonProgress(null);
      setVideoProgress(0);
    }
  };

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
    const progress = (currentTime / duration) * 100;

    setVideoProgress(progress);

    // Auto-save progress every 10 seconds
    if (!progressUpdateInterval.current) {
      progressUpdateInterval.current = setInterval(async () => {
        try {
          await lessonProgressService.updateWatchProgress({
            enrollmentId: enrollment.id,
            lessonId: currentLesson.id,
            lastPosition: Math.floor(videoRef.current!.currentTime),
            watchDuration: Math.floor(videoRef.current!.currentTime),
          });
        } catch (err) {
          console.error('Error saving progress:', err);
        }
      }, 10000);
    }
  };

  const handleVideoEnded = async () => {
    if (!currentLesson || !enrollment) return;

    try {
      await lessonProgressService.completeLesson(enrollment.id, currentLesson.id);
      setLessonProgress({ ...lessonProgress!, isCompleted: true });
      
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
      setLessonProgress({ ...lessonProgress!, isCompleted: true });
      
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
      alert(err.response?.data?.message || 'Failed to mark lesson as complete');
    }
  };

  const handleLessonClick = (lesson: LessonResponse) => {
    // Stop current video
    if (videoRef.current) {
      videoRef.current.pause();
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

  const isLessonLocked = (lesson: LessonResponse): boolean => {
    // Implement lock logic: Lock if previous lesson not completed
    const currentIndex = lessons.findIndex(l => l.id === lesson.id);
    if (currentIndex === 0) return false;
    
    // Check if previous lesson is completed
    // This requires lesson progress data - for now, all unlocked
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Course not found</p>
          <Button variant="primary" onClick={() => navigate('/my-learning')}>
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
              onClick={() => navigate('/my-learning')}
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

      <div className="flex">
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
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                />
                
                {/* Video Overlay - Progress */}
                {videoProgress > 0 && videoProgress < 100 && (
                  <div className="absolute bottom-20 left-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-white text-sm mb-2">
                        Progress: {Math.floor(videoProgress)}%
                      </p>
                      <ProgressBar progress={videoProgress} color="blue" size="sm" />
                    </div>
                  </div>
                )}
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
                
                {!lessonProgress?.isCompleted && (
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

            <div className="p-2">
              {lessons.map((lesson, index) => {
                const isActive = currentLesson?.id === lesson.id;
                const isLocked = isLessonLocked(lesson);
                // Check if lesson is completed from lesson progress
                const isCompleted = lessonProgress?.lessonId === lesson.id && lessonProgress?.isCompleted;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => !isLocked && handleLessonClick(lesson)}
                    disabled={isLocked}
                    className={`
                      w-full text-left p-3 rounded-lg mb-2 transition-colors
                      ${isActive ? 'bg-blue-50 border-2 border-blue-600' : 'hover:bg-gray-50'}
                      ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Lesson Number/Status */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : isLocked ? (
                          <Lock className="w-4 h-4 text-gray-400" />
                        ) : isActive ? (
                          <Play className="w-4 h-4 text-blue-600" />
                        ) : (
                          <span className="text-sm font-medium text-gray-600">
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm line-clamp-2 ${
                          isActive ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {lesson.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {lesson.contentType === ContentType.VIDEO && (
                            <>
                              <Video className="w-3 h-3" />
                              <span>{lesson.videoDuration ? Math.round(lesson.videoDuration / 60) : 0} min</span>
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
                        <ProgressBar progress={videoProgress} size="sm" color="blue" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};