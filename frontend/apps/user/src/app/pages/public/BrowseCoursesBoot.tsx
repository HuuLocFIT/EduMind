import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BrowseCoursesSkeleton } from "../../components/route-skeletons/BrowseCoursesSkeleton";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

const BrowseCoursesReadyContext = createContext<() => void>(() => undefined);

export const useBrowseCoursesReadySignal = () =>
  useContext(BrowseCoursesReadyContext);

const getActiveFilterGroupCount = (searchParams: URLSearchParams) => {
  let count = 0;
  if (searchParams.get("filter") === "free") count += 1;
  if (searchParams.get("categories")) count += 1;
  if (searchParams.get("levels")) count += 1;
  if (
    searchParams.get("filter") !== "free" &&
    (searchParams.get("minPrice") || searchParams.get("maxPrice"))
  ) count += 1;
  if (searchParams.get("minRating")) count += 1;
  if (searchParams.get("q")) count += 1;
  return count;
};

export const BrowseCoursesBoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();
  const signalReady = useCallback(() => setReady(true), []);
  const activeFilterGroupCount = useMemo(
    () => getActiveFilterGroupCount(searchParams),
    [searchParams],
  );

  return (
    <BrowseCoursesReadyContext.Provider value={signalReady}>
      {!ready && (
        <>
          <SeoMetaTags
            title="Browse Courses"
            description="Browse courses available on EduMind."
          />
          <BrowseCoursesSkeleton activeFilterGroupCount={activeFilterGroupCount} />
        </>
      )}
      <div hidden={!ready} aria-hidden={!ready} inert={!ready}>
        {children}
      </div>
    </BrowseCoursesReadyContext.Provider>
  );
};
