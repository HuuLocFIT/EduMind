import React, { createContext, useCallback, useContext, useState } from 'react';
import { CoursePlayerSkeleton } from '../../../components/route-skeletons/CoursePlayerSkeleton';

// Single skeleton owner for the Course Player route. Mounted outside the
// route's Suspense boundary so this skeleton's DOM node survives the
// chunk-load -> data-load handoff instead of being torn down and replaced by
// a second, freshly-mounted skeleton that CoursePlayerPage renders itself
// while it fetches data (the "double flash" this component exists to fix).
const CoursePlayerReadyContext = createContext<() => void>(() => undefined);

export const useCoursePlayerReadySignal = () => useContext(CoursePlayerReadyContext);

export const CoursePlayerBoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  // One-way latch: once CoursePlayerPage reports it's done loading, this
  // route never shows the Boot-level skeleton again for the mounted page
  // instance (subsequent lesson/course switches use the page's own internal
  // skeletons instead — see CoursePlayerPage.tsx).
  const signalReady = useCallback(() => setReady(true), []);

  return (
    <CoursePlayerReadyContext.Provider value={signalReady}>
      {!ready && <CoursePlayerSkeleton withSeo />}
      <div hidden={!ready}>{children}</div>
    </CoursePlayerReadyContext.Provider>
  );
};
