import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAuthUiReady } from "./useAuthUiReady";

describe("useAuthUiReady", () => {
  afterEach(() => {
    delete window.__EDUMIND_PRERENDER__;
  });

  it("reveals auth-dependent UI after the first browser commit", async () => {
    const { result } = renderHook(() => useAuthUiReady());

    await waitFor(() => expect(result.current).toBe(true));
  });

  it("stays neutral for the entire Puppeteer prerender", async () => {
    window.__EDUMIND_PRERENDER__ = true;
    const { result } = renderHook(() => useAuthUiReady());

    await Promise.resolve();
    expect(result.current).toBe(false);
  });
});
