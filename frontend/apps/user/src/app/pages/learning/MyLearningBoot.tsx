import React, { createContext, useCallback, useContext, useState } from "react";
import { MyLearningSkeleton } from "../../components/route-skeletons/MyLearningSkeleton";

const MyLearningReadyContext = createContext<() => void>(() => undefined);

export const useMyLearningReadySignal = () =>
  useContext(MyLearningReadyContext);

export const MyLearningBoot: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ready, setReady] = useState(false);
  const signalReady = useCallback(() => setReady(true), []);

  return (
    <MyLearningReadyContext.Provider value={signalReady}>
      {!ready && <MyLearningSkeleton />}
      <div hidden={!ready} aria-hidden={!ready} inert={!ready}>
        {children}
      </div>
    </MyLearningReadyContext.Provider>
  );
};
