import React, { Suspense, lazy, useLayoutEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { MyLearningBoot, useMyLearningReadySignal } from "./MyLearningBoot";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("My Learning loading handoff", () => {
  it("keeps one skeleton DOM node until initial data settles", async () => {
    const chunk = deferred<{ default: React.FC<{ ready: boolean }> }>();
    const LazyPage = lazy(() => chunk.promise);

    const Page: React.FC<{ ready: boolean }> = ({ ready }) => {
      const signalReady = useMyLearningReadySignal();
      useLayoutEffect(() => {
        if (ready) signalReady();
      }, [ready, signalReady]);
      return <main>My Learning content</main>;
    };

    const view = render(
      <MyLearningBoot>
        <Suspense fallback={null}>
          <LazyPage ready={false} />
        </Suspense>
      </MyLearningBoot>,
    );
    const originalSkeleton = screen.getByLabelText("Loading My Learning");

    await act(async () => chunk.resolve({ default: Page }));
    expect(screen.getByLabelText("Loading My Learning")).toBe(originalSkeleton);
    expect(screen.queryByText("My Learning content")).not.toBeVisible();

    view.rerender(
      <MyLearningBoot>
        <Suspense fallback={null}>
          <LazyPage ready />
        </Suspense>
      </MyLearningBoot>,
    );

    expect(
      screen.queryByLabelText("Loading My Learning"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("My Learning content")).toBeVisible();
  });
});
