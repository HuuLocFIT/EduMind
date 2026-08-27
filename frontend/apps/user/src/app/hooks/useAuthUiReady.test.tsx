import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthUiReady } from "./useAuthUiReady";
import { useAuthStore } from "../stores/auth.store";

describe("useAuthUiReady", () => {
  beforeEach(() => {
    useAuthStore.setState({ authBootStatus: "idle" });
  });

  afterEach(() => {
    delete window.__EDUMIND_PRERENDER__;
    useAuthStore.setState({ authBootStatus: "idle" });
  });

  it("stays neutral until the boot probe completes for a real browser", () => {
    const { result } = renderHook(() => useAuthUiReady());

    expect(result.current).toBe(false);

    act(() => {
      useAuthStore.setState({ authBootStatus: "ready" });
    });

    expect(result.current).toBe(true);
  });

  it("stays neutral for the entire Puppeteer prerender, even after boot completes", () => {
    window.__EDUMIND_PRERENDER__ = true;
    const { result } = renderHook(() => useAuthUiReady());

    act(() => {
      useAuthStore.setState({ authBootStatus: "ready" });
    });

    expect(result.current).toBe(false);
  });
});
