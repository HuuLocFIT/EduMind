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
import { useVersionGuard } from './useVersionGuard';

interface UseCoursePlayerDataOptions {
  courseSlug: string | undefined;
  currentLesson: LessonResponse | null;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  setCurrentLesson: (lesson: LessonResponse | null) => void;
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

  // Monotonic versions that invalidate stale in-flight work when the course
  // slug changes or the component unmounts. The service calls do not accept an
  // AbortSignal, so every await boundary re-checks its version and simply
  // stops touching state once it no longer matches. Reconciliation gets its own
  // guard (bumped alongside the fetch guard on every course switch and on
  // unmount); because a reconciliation can also be *started* late by a stale
  // completion closure, it additionally checks course identity — see
  // reconcileEnrollmentProgress.
  const fetchVersion = useVersionGuard();
  const reconcileVersion = useVersionGuard();

  // Live mirror of resolvedCourseId, so async work started for a previous
  // course can compare the course it belongs to (captured from its closure)
  // against the course that is current *now*.
  const resolvedCourseIdRef = useRef<number | null>(null);
  useEffect(() => {
    resolvedCourseIdRef.current = resolvedCourseId;
  }, [resolvedCourseId]);

  // Read via ref so the fetch effect only re-runs on courseSlug change, not on
  // every search-param update (setSearchParams is itself called from inside
  // fetchCourseData when resolving the initial lesson).
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const checkEnrollment = async (courseId: number, version: number) => {
    try {
      if (!fetchVersion.isCurrent(version)) return;
      const foundEnrollment = await enrollmentService.getMyEnrollmentForCourse(courseId);
      if (!fetchVersion.isCurrent(version)) return;

      if (!foundEnrollment) {
        setAccessError(buildCourseAccessError('NOT_ENROLLED', courseSlug!));
        return;
      }

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
        const allProgress = await lessonProgressService.getEnrollmentProgress(foundEnrollment.id);
        if (!fetchVersion.isCurrent(version)) return;
        setAllLessonProgress(allProgress);
      } catch (progressErr) {
        console.error('Error loading lesson progress:', progressErr);
        if (!fetchVersion.isCurrent(version)) return;
        setAllLessonProgress([]);
      }
    } catch (err) {
      if (!fetchVersion.isCurrent(version)) return;
      console.error('Error checking enrollment:', err);
      setAccessError(buildCourseAccessError('LOOKUP_FAILED', courseSlug!));
    }
  };

  const fetchCourseData = async (version: number) => {
    setLoading(true);
    try {
      if (!fetchVersion.isCurrent(version)) return;

      // Resolve course by slug
      const courseData = await courseService.getCourseBySlug(courseSlug!);
      const numericCourseId = courseData.id;

      if (!fetchVersion.isCurrent(version)) return;

      setResolvedCourseId(numericCourseId);

      // getCourseBySlug already returns sections with nested lessons
      // (metadata-only: videoUrl/articleContent/resources are null). Use them
      // to resolve the contentType hint one round trip earlier than the
      // official resolve below, so the loading skeleton can pick the right
      // shape before getCourseLessons/getCourseSections come back. Never used
      // to set currentLesson itself.
      const nestedLessons = courseData.sections?.flatMap((s) => s.lessons ?? []) ?? [];
      if (nestedLessons.length > 0 && fetchVersion.isCurrent(version)) {
        const hintSections = courseData.sections ?? [];
        const sortedHintLessons = sortCourseLessons(hintSections, nestedLessons);
        const hintLessonIdParam =
          searchParamsRef.current.get('lesson') || searchParamsRef.current.get('lessonId');
        const hintLastLessonId = localStorage.getItem(`course_${courseSlug}_last_lesson`);
        const hintLesson = resolveInitialLesson(
          sortedHintLessons,
          hintLessonIdParam,
          hintLastLessonId
        );

        if (hintLesson) {
          setSearchParams(
            { lesson: hintLesson.id.toString(), type: hintLesson.contentType },
            { replace: true }
          );
          localStorage.setItem(`course_${courseSlug}_last_lesson`, hintLesson.id.toString());
          localStorage.setItem(`course_${courseSlug}_last_lesson_type`, hintLesson.contentType);
          localStorage.setItem(`lesson_${hintLesson.id}_type`, hintLesson.contentType);
        }
      }

      // Fetch sections and lessons with resolved numeric ID
      const [courseSections, courseLessons] = await Promise.all([
        sectionService.getCourseSections(numericCourseId),
        lessonService.getCourseLessons(numericCourseId),
      ]);

      if (!fetchVersion.isCurrent(version)) return;

      setCourse(courseData);
      setSections(courseSections);
      setExpandedSectionIds(courseSections.map((s) => s.id));

      // Sort lessons by section order and lesson order
      const sortedLessons = sortCourseLessons(courseSections, courseLessons);

      if (!fetchVersion.isCurrent(version)) return;

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

      if (!fetchVersion.isCurrent(version)) return;

      // Check enrollment after we have the resolved course ID
      await checkEnrollment(numericCourseId, version);
    } catch (err) {
      console.error('Error fetching course data:', err);
      if (!fetchVersion.isCurrent(version)) return;
      setLessons([]);
    } finally {
      if (fetchVersion.isCurrent(version)) {
        setLoading(false);
      }
    }
  };

  // Clear every course-scoped piece of state so a slug switch can never leak
  // the previous course's lesson/enrollment/access-error into the new one.
  const resetCourseState = () => {
    setResolvedCourseId(null);
    setCourse(null);
    setSections([]);
    setExpandedSectionIds([]);
    setLessons([]);
    setAllLessonProgress([]);
    setEnrollment(null);
    setAccessError(null);
    setConfirmedCourseComplete(false);
    setCurrentLesson(null);
  };

  useEffect(() => {
    const version = fetchVersion.bump();
    // Also invalidate any completion reconciliation still in flight for the
    // previous course — otherwise it can resolve after the switch and write
    // the old course's enrollment/progress/completion state onto the new one.
    reconcileVersion.bump();
    resetCourseState();

    if (courseSlug) {
      void fetchCourseData(version);
    }

    return () => {
      // Invalidate any in-flight fetch or reconciliation belonging to this
      // effect run (including on unmount) by advancing past its version, so
      // nothing calls a state setter on an unmounted/replaced course.
      fetchVersion.bump();
      reconcileVersion.bump();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  // Reconcile the optimistic local state with the server truth in the
  // background, then refresh cross-page caches.
  //
  // Version alone cannot make this safe: a reconciliation can be *started* by a
  // stale completion closure after the course already switched, and its own
  // bump() would make it the current version. So the course this call belongs
  // to is captured from the closure (`resolvedCourseId` as of the render that
  // produced it) and compared against the live course before every state write.
  const reconcileEnrollmentProgress = async (enrollmentId: number) => {
    const ownerCourseId = resolvedCourseId;
    const belongsToCurrentCourse = () =>
      ownerCourseId !== null && ownerCourseId === resolvedCourseIdRef.current;
    try {
      // Started after a course switch — the caller's course is gone, so there
      // is nothing to reconcile into. Not an error: the completion itself
      // succeeded, and the finally block still refreshes cross-page caches.
      // Checked before bumping, so a stale call cannot invalidate a legitimate
      // reconciliation that is already in flight for the current course.
      if (!belongsToCurrentCourse()) return;

      const version = reconcileVersion.bump();
      const [allProgress, found] = await Promise.all([
        lessonProgressService.getEnrollmentProgress(enrollmentId),
        enrollmentService.getMyEnrollmentForCourse(ownerCourseId!),
      ]);
      if (!reconcileVersion.isCurrent(version)) return;
      if (!belongsToCurrentCourse()) return;

      if (!found) {
        // Throw before any state write so a failed reconciliation leaves the
        // local state untouched rather than half-applied.
        throw new Error('The updated enrollment could not be loaded.');
      }
      setAllLessonProgress(allProgress);
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
  // lesson as a no-op. The courseId match guards against the brief render
  // where the lesson of the new course is paired with the previous course's
  // enrollment.
  useEffect(() => {
    if (!currentLesson || !enrollment) return;
    if (resolvedCourseId === null || enrollment.courseId !== resolvedCourseId) return;
    lessonProgressService.startLesson(enrollment.id, currentLesson.id).catch((err) => {
      console.log('Lesson already started or error:', err);
    });
  }, [currentLesson, enrollment, resolvedCourseId]);

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
