import React, { Suspense, lazy, useLayoutEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  BrowseCoursesBoot,
  useBrowseCoursesReadySignal,
} from "./BrowseCoursesBoot";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe("Browse Courses loading handoff", () => {
  it("keeps one skeleton DOM node until initial queries settle", async () => {
    const chunk = deferred<{ default: React.FC<{ settled: boolean }> }>();
    const LazyPage = lazy(() => chunk.promise);

    const Page: React.FC<{ settled: boolean }> = ({ settled }) => {
      const signalReady = useBrowseCoursesReadySignal();
      useLayoutEffect(() => {
        if (settled) signalReady();
      }, [settled, signalReady]);
      return <main>Browse Courses content</main>;
    };

    const view = render(
      <MemoryRouter>
        <BrowseCoursesBoot>
          <Suspense fallback={null}>
            <LazyPage settled={false} />
          </Suspense>
        </BrowseCoursesBoot>
      </MemoryRouter>,
    );
    const originalSkeleton = screen.getByRole("status", {
      name: "Loading courses",
    });

    await act(async () => chunk.resolve({ default: Page }));
    expect(screen.getByRole("status", { name: "Loading courses" })).toBe(
      originalSkeleton,
    );
    expect(screen.queryByText("Browse Courses content")).not.toBeVisible();

    view.rerender(
      <MemoryRouter>
        <BrowseCoursesBoot>
          <Suspense fallback={null}>
            <LazyPage settled />
          </Suspense>
        </BrowseCoursesBoot>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("status", { name: "Loading courses" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Browse Courses content")).toBeVisible();
  });

  it("reserves active-filter groups represented in the URL", () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/courses?filter=free&categories=1,2&levels=BEGINNER&minRating=4&q=react",
        ]}
      >
        <BrowseCoursesBoot>
          <div>Hidden content</div>
        </BrowseCoursesBoot>
      </MemoryRouter>,
    );

    const activeFilters = screen.getByTestId(
      "browse-active-filter-skeletons",
    );
    expect(activeFilters.children).toHaveLength(5);
  });
});
