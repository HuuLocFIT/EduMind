import { useSearchParams, useLocation } from "react-router-dom";

export type LessonTypeHint = "VIDEO" | "ARTICLE" | "QUIZ" | undefined;

function parseValidType(val?: string | null): LessonTypeHint {
  if (!val) return undefined;
  const upper = val.toUpperCase();
  if (upper === "VIDEO" || upper === "ARTICLE" || upper === "QUIZ") {
    return upper as LessonTypeHint;
  }
  return undefined;
}

/**
 * Best-effort guess at the current lesson's content type before the real
 * lesson data has loaded, so loading skeletons can render the right shape
 * (video vs. article vs. quiz) instead of a generic shell. Checks, in order:
 * an explicit override, the `type` query param, and finally a per-lesson (or
 * per-course "last lesson") localStorage hint left behind by a previous
 * visit. Falls back to `undefined` (neutral shell) if none resolve.
 */
export function useLessonTypeHint(explicitType?: LessonTypeHint): LessonTypeHint {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const typeFromProp = parseValidType(explicitType);
  const typeFromParam = parseValidType(searchParams.get("type"));

  let typeFromStorage: LessonTypeHint;
  try {
    const lessonId = searchParams.get("lesson") || searchParams.get("lessonId");
    if (lessonId) {
      typeFromStorage = parseValidType(localStorage.getItem(`lesson_${lessonId}_type`));
    }
    if (!typeFromStorage) {
      const pathname = location.pathname || (typeof window !== "undefined" ? window.location.pathname : "");
      const match = pathname.match(/learning\/([^/?#]+)/);
      if (match && match[1]) {
        typeFromStorage = parseValidType(localStorage.getItem(`course_${match[1]}_last_lesson_type`));
      }
    }
  } catch {
    // Ignore storage access errors
  }

  return typeFromProp ?? typeFromParam ?? typeFromStorage;
}
