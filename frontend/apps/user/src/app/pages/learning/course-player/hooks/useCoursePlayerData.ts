import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SetURLSearchParams } from 'react-router-dom';
import type {
  CourseDetailResponse,
  EnrollmentResponse,
  LessonProgressResponse,
  LessonResponse,
  SectionResponse,
} from '@edumind/shared-types';
import { EnrollmentStatus } from '@edumind/shared-constants';
import { buildRouteWithParams, USER_ROUTES } from '@edumind/shared-utils';
import { courseService } from '../../../../services/course.service';
import { enrollmentService } from '../../../../services/enrollment.service';
import { lessonProgressService } from '../../../../services/lesson-progress.service';
import { lessonService } from '../../../../services/lesson.service';
import { sectionService } from '../../../../services/section.service';
import { queryKeys } from '../../../../lib/query-keys';
import type { AccessError } from '../course-player.types';
import {
  buildCourseAccessError,
  isCourseCompleteFromEnrollment,
  resolveInitialLesson,
  sortCourseLessons,
} from '../course-player.utils';

interface UseCoursePlayerDataOptions {
  courseSlug: string | undefined;
  currentLesson: LessonResponse | null;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  setCurrentLesson: (lesson: LessonResponse) => void;
}

/**
 * Loads the course/sections/lessons/enrollment/progress for the player and
 * resolves which lesson to open initially (query param -> localStorage ->
 * first lesson). Also owns access-error detection (not enrolled / dropped /
 * suspended), section expand/collapse, marking the current lesson as
 * started, and the post-completion enrollment reconciliation used by the
 * completion workflow.
 */
export function useCoursePlayerData({
  courseSlug,
  currentLesson,
  searchParams,
  setSearchParams,
  setCurrentLesson,
}: UseCoursePlayerDataOptions) {
  const queryClient = useQueryClient();

  const [resolvedCourseId, setResolvedCourseId] = useState<number | null>(null);
  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [expandedSectionIds, setExpandedSectionIds] = useState<number[]>([]);
  const [allLessonProgress, setAllLessonProgress] = useState<LessonProgressResponse[]>([]);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<AccessError | null>(null);
  const [confirmedCourseComplete, setConfirmedCourseComplete] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const reconcileVersionRef = useRef(0);

  // Read via ref so the fetch effect only re-runs on courseSlug change, not on
  // every search-param update (setSearchParams is itself called from inside
  // fetchCourseData when resolving the initial lesson).
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const checkEnrollment = async (courseId: number, signal?: AbortSignal) => {
    try {
      if (signal?.aborted) return;
      const isEnrolled = await enrollmentService.checkEnrollmentStatus(courseId);
      if (signal?.aborted) return;
      if (!isEnrolled) {
        setAccessError(buildCourseAccessError('NOT_ENROLLED', courseSlug!));
        return;
      }

      // Get enrollment details
      const response = await enrollmentService.getMyEnrollments({ page: 0, size: 100 });
      if (signal?.aborted) return;
      const foundEnrollment = response.data?.find((e) => e.courseId === courseId);
      if (foundEnrollment) {
        // Business rules:
        // - DROPPED: treat as not enrolled -> redirect to course detail / purchase.
        // - SUSPENDED: student still "owns" the course but access is forbidden.
        if (foundEnrollment.status === EnrollmentStatus.DROPPED) {
          setAccessError(buildCourseAccessError(EnrollmentStatus.DROPPED, courseSlug!));
          return;
        }

        if (foundEnrollment.status === EnrollmentStatus.SUSPENDED) {
          setAccessError(buildCourseAccessError(EnrollmentStatus.SUSPENDED, courseSlug!));
          return;
        }

        setEnrollment(foundEnrollment);
        const completeAtLoad = isCourseCompleteFromEnrollment(foundEnrollment);
        setConfirmedCourseComplete(completeAtLoad);
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
      if (signal?.aborted) return;
      console.error('Error checking enrollment:', err);
      setAccessError({
        title: 'Unable to load course',
        message:
          'We were unable to verify your enrollment for this course. Please try again or go back to the course page.',
        redirectTo: buildRouteWithParams(USER_ROUTES.COURSE_DETAIL, {
          courseSlug: courseSlug!,
        }),
      });
    }
  };

  const fetchCourseData = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      if (signal?.aborted) return;

      // Resolve course by slug
      const courseData = await courseService.getCourseBySlug(courseSlug!);
      const numericCourseId = courseData.id;
      setResolvedCourseId(numericCourseId);

      if (signal?.aborted) return;

      // Fetch sections and lessons with resolved numeric ID
      const [courseSections, courseLessons] = await Promise.all([
        sectionService.getCourseSections(numericCourseId),
        lessonService.getCourseLessons(numericCourseId),
      ]);

      if (signal?.aborted) return;

      setCourse(courseData);
      setSections(courseSections);
      setExpandedSectionIds(courseSections.map((s) => s.id));

      // Sort lessons by section order and lesson order
      const sortedLessons = sortCourseLessons(courseSections, courseLessons);

      if (signal?.aborted) return;

      setLessons(sortedLessons);

      // Restore last lesson or default to first if available
      if (sortedLessons.length > 0) {
        const lessonIdParam =
          searchParamsRef.current.get('lesson') || searchParamsRef.current.get('lessonId');
        const lastLessonId = localStorage.getItem(`course_${courseSlug}_last_lesson`);

        const targetLesson = resolveInitialLesson(sortedLessons, lessonIdParam, lastLessonId)!;

        setCurrentLesson(targetLesson);
        setSearchParams(
          { lesson: targetLesson.id.toString(), type: targetLesson.contentType },
          { replace: true }
        );
        localStorage.setItem(`course_${courseSlug}_last_lesson`, targetLesson.id.toString());
        localStorage.setItem(`course_${courseSlug}_last_lesson_type`, targetLesson.contentType);
        localStorage.setItem(`lesson_${targetLesson.id}_type`, targetLesson.contentType);
      }

      if (signal?.aborted) return;

      // Check enrollment after we have the resolved course ID
      await checkEnrollment(numericCourseId, signal);
    } catch (err) {
      console.error('Error fetching course data:', err);
      if (signal?.aborted) return;
      setLessons([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (courseSlug) {
      fetchCourseData(signal);
    }

    return () => {
      abortControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  // Reconcile the optimistic local state with the server truth in the
  // background, then refresh cross-page caches.
  const reconcileEnrollmentProgress = async (enrollmentId: number) => {
    const version = ++reconcileVersionRef.current;
    try {
      const [allProgress, response] = await Promise.all([
        lessonProgressService.getEnrollmentProgress(enrollmentId),
        enrollmentService.getMyEnrollments({ page: 0, size: 100 }),
      ]);
      if (version !== reconcileVersionRef.current) return;
      setAllLessonProgress(allProgress);
      const found = response.data?.find(
        (e) => resolvedCourseId !== null && e.courseId === resolvedCourseId
      );
      if (!found) {
        throw new Error('The updated enrollment could not be loaded.');
      }
      setEnrollment(found);
      setConfirmedCourseComplete(isCourseCompleteFromEnrollment(found));
    } finally {
      // Invalidate enrollment cache so MyLearningPage shows fresh data on next visit.
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    }
  };

  const toggleSection = (sectionId: number) => {
    setExpandedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  // Marks the current lesson as started once both it and the enrollment are
  // known. Safe to call repeatedly — the backend treats an already-started
  // lesson as a no-op.
  useEffect(() => {
    if (!currentLesson || !enrollment) return;
    lessonProgressService.startLesson(enrollment.id, currentLesson.id).catch((err) => {
      console.log('Lesson already started or error:', err);
    });
  }, [currentLesson, enrollment]);

  return {
    resolvedCourseId,
    course,
    sections,
    lessons,
    expandedSectionIds,
    toggleSection,
    allLessonProgress,
    setAllLessonProgress,
    enrollment,
    setEnrollment,
    loading,
    accessError,
    setAccessError,
    confirmedCourseComplete,
    setConfirmedCourseComplete,
    reconcileEnrollmentProgress,
  };
}
