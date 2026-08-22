import React, { Suspense, lazy, useLayoutEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { DashboardBoot, useDashboardReadySignal } from "./DashboardBoot";
import { DashboardSkeleton } from "../../components/route-skeletons/DashboardSkeleton";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("Dashboard loading handoff", () => {
  it("reserves the application banner region only when requested", () => {
    const view = render(<DashboardSkeleton showApplicationBanner />);
    expect(
      screen.getByTestId("dashboard-application-banner-skeleton"),
    ).toBeInTheDocument();

    view.rerender(<DashboardSkeleton />);
    expect(
      screen.queryByTestId("dashboard-application-banner-skeleton"),
    ).not.toBeInTheDocument();
  });

  it("keeps one skeleton DOM node until critical data settles", async () => {
    const chunk = deferred<{ default: React.FC<{ ready: boolean }> }>();
    const LazyDashboard = lazy(() => chunk.promise);

    const Page: React.FC<{ ready: boolean }> = ({ ready }) => {
      const signalReady = useDashboardReadySignal();
      useLayoutEffect(() => {
        if (ready) signalReady();
      }, [ready, signalReady]);
      return <main>Dashboard content</main>;
    };

    const view = render(
      <DashboardBoot>
        <Suspense fallback={null}>
          <LazyDashboard ready={false} />
        </Suspense>
      </DashboardBoot>,
    );
    const originalSkeleton = screen.getByRole("status", {
      name: "Loading dashboard",
    });

    await act(async () => chunk.resolve({ default: Page }));
    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBe(
      originalSkeleton,
    );
    expect(screen.queryByText("Dashboard content")).not.toBeVisible();

    view.rerender(
      <DashboardBoot>
        <Suspense fallback={null}>
          <LazyDashboard ready />
        </Suspense>
      </DashboardBoot>,
    );

    expect(
      screen.queryByRole("status", { name: "Loading dashboard" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeVisible();
  });
});
