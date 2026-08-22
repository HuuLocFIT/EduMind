import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthUiReady } from "./useAuthUiReady";

describe("useAuthUiReady", () => {
  afterEach(() => {
    delete window.__EDUMIND_PRERENDER__;
  });

  it("is ready on the very first render for a real browser", () => {
    const { result } = renderHook(() => useAuthUiReady());

    expect(result.current).toBe(true);
  });

  it("stays neutral for the entire Puppeteer prerender", () => {
    window.__EDUMIND_PRERENDER__ = true;
    const { result } = renderHook(() => useAuthUiReady());

    expect(result.current).toBe(false);
  });
});
