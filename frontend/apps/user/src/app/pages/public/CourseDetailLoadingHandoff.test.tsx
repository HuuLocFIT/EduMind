import React, { lazy, Suspense, useLayoutEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  CourseDetailBoot,
  useCourseDetailReadySignal,
} from "./CourseDetailBoot";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

type PageProps = {
  querySettled: boolean;
  notFound?: boolean;
};

const TestPage: React.FC<PageProps> = ({ querySettled, notFound = false }) => {
  const signalReady = useCourseDetailReadySignal();

  useLayoutEffect(() => {
    if (querySettled) signalReady();
  }, [querySettled, signalReady]);

  if (!querySettled) return null;
  return <main>{notFound ? "Course not found" : "Course detail content"}</main>;
};

describe("Course Detail loading handoff", () => {
  it("keeps one skeleton DOM node until the lazy chunk and primary query settle", async () => {
    const chunk = deferred<{ default: React.FC<PageProps> }>();
    const LazyPage = lazy(() => chunk.promise);

    const view = render(
      <MemoryRouter>
        <CourseDetailBoot>
          <Suspense fallback={null}>
            <LazyPage querySettled={false} />
          </Suspense>
        </CourseDetailBoot>
      </MemoryRouter>,
    );

    const originalSkeleton = screen.getByRole("status", {
      name: "Loading course details",
    });
    expect(screen.getAllByText("Loading course details")).toHaveLength(1);

    await act(async () => chunk.resolve({ default: TestPage }));

    expect(
      screen.getByRole("status", { name: "Loading course details" }),
    ).toBe(originalSkeleton);
    expect(screen.queryByText("Course detail content")).not.toBeInTheDocument();

    view.rerender(
      <MemoryRouter>
        <CourseDetailBoot>
          <Suspense fallback={null}>
            <LazyPage querySettled />
          </Suspense>
        </CourseDetailBoot>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("status", { name: "Loading course details" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Course detail content")).toBeVisible();
  });

  it("reveals the not-found state when the primary query settles", () => {
    render(
      <MemoryRouter>
        <CourseDetailBoot>
          <TestPage querySettled notFound />
        </CourseDetailBoot>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("status", { name: "Loading course details" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Course not found")).toBeVisible();
  });
});
