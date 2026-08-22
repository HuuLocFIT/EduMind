import React, { createContext, useCallback, useContext, useState } from "react";
import { DashboardSkeleton } from "../../components/route-skeletons/DashboardSkeleton";
import { useAuthStore } from "../../stores/auth.store";
import { UserRole } from "@edumind/shared-constants";

const DashboardReadyContext = createContext<() => void>(() => undefined);

export const useDashboardReadySignal = () => useContext(DashboardReadyContext);

export const DashboardBoot: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [ready, setReady] = useState(false);
  const user = useAuthStore((state) => state.user);
  const showApplicationBannerSkeleton = Boolean(
    user?.roles.includes(UserRole.STUDENT) &&
    !user.roles.includes(UserRole.TEACHER) &&
    !user.roles.includes(UserRole.TEACHER_TRIAL),
  );
  const signalReady = useCallback(() => setReady(true), []);

  return (
    <DashboardReadyContext.Provider value={signalReady}>
      {!ready && (
        <DashboardSkeleton
          showApplicationBanner={showApplicationBannerSkeleton}
        />
      )}
      <div hidden={!ready} aria-hidden={!ready} inert={!ready}>
        {children}
      </div>
    </DashboardReadyContext.Provider>
  );
};
