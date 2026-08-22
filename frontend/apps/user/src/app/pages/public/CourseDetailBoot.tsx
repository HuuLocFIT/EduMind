import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { CourseDetailSkeleton } from "../../components/route-skeletons";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

const CourseDetailReadyContext = createContext<() => void>(() => undefined);

export const useCourseDetailReadySignal = () =>
  useContext(CourseDetailReadyContext);

/**
 * Owns the Course Detail route's initial skeleton across both lazy chunk and
 * primary query loading, preventing a second skeleton from mounting during
 * the handoff between those two phases.
 */
export const CourseDetailBoot: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ready, setReady] = useState(false);
  const signalReady = useCallback(() => setReady(true), []);

  return (
    <CourseDetailReadyContext.Provider value={signalReady}>
      {!ready && (
        <>
          <SeoMetaTags
            key="loading"
            title="Loading Course..."
            description="Accessing course details on EduMind"
          />
          <div
            aria-busy="true"
            aria-describedby="course-loading-status"
            role="status"
            aria-label="Loading course details"
          >
            <p id="course-loading-status" className="sr-only">
              Loading course details
            </p>
            <CourseDetailSkeleton />
          </div>
        </>
      )}
      <div hidden={!ready} aria-hidden={!ready} inert={!ready}>
        {children}
      </div>
    </CourseDetailReadyContext.Provider>
  );
};

