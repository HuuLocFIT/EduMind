import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserRole } from "@edumind/shared-constants";
import {
  useTeacherApplication,
  useTeacherApplicationStatus,
} from "./useTeacherApplication";

vi.mock("../stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("../services/teacher-application.service", () => ({
  teacherApplicationService: {
    getMyApplication: vi.fn(),
  },
}));

import { useAuthStore } from "../stores/auth.store";
import { teacherApplicationService } from "../services/teacher-application.service";

const mockAuthStore = vi.mocked(useAuthStore);
const mockGetMyApplication = vi.mocked(
  teacherApplicationService.getMyApplication,
);

const renderWithClient = <T,>(hook: () => T) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return renderHook(hook, {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  });
};

describe("useTeacherApplicationStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canApply is true and hasApplication is false when there is no application", async () => {
    mockAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, roles: [UserRole.STUDENT] },
    } as ReturnType<typeof useAuthStore>);
    mockGetMyApplication.mockResolvedValue(null);

    const { result } = renderWithClient(() => useTeacherApplicationStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canApply).toBe(true);
    expect(result.current.hasApplication).toBe(false);
    expect(result.current.isRejected).toBe(false);
  });

  it("canApply is false while PENDING", async () => {
    mockAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, roles: [UserRole.STUDENT] },
    } as ReturnType<typeof useAuthStore>);
    mockGetMyApplication.mockResolvedValue({ status: "PENDING" } as never);

    const { result } = renderWithClient(() => useTeacherApplicationStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canApply).toBe(false);
    expect(result.current.hasApplication).toBe(true);
    expect(result.current.isRejected).toBe(false);
  });

  it("canApply and isRejected are true when REJECTED", async () => {
    mockAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, roles: [UserRole.STUDENT] },
    } as ReturnType<typeof useAuthStore>);
    mockGetMyApplication.mockResolvedValue({ status: "REJECTED" } as never);

    const { result } = renderWithClient(() => useTeacherApplicationStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canApply).toBe(true);
    expect(result.current.isRejected).toBe(true);
    expect(result.current.hasApplication).toBe(true);
  });

  it("canApply is false and hasApplication is true when APPROVED", async () => {
    mockAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, roles: [UserRole.STUDENT, UserRole.TEACHER] },
    } as ReturnType<typeof useAuthStore>);
    mockGetMyApplication.mockResolvedValue({ status: "APPROVED" } as never);

    const { result } = renderWithClient(() => useTeacherApplicationStatus());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.canApply).toBe(false);
    expect(result.current.hasApplication).toBe(true);
  });
});

describe("useTeacherApplication enabled condition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays enabled for a user with both STUDENT and TEACHER roles", async () => {
    mockAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, roles: [UserRole.STUDENT, UserRole.TEACHER] },
    } as ReturnType<typeof useAuthStore>);
    mockGetMyApplication.mockResolvedValue({ status: "APPROVED" } as never);

    const { result } = renderWithClient(() => useTeacherApplication());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetMyApplication).toHaveBeenCalled();
    expect(result.current.data).toEqual({ status: "APPROVED" });
  });

  it("stays disabled for an unauthenticated user", () => {
    mockAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
    } as ReturnType<typeof useAuthStore>);

    const { result } = renderWithClient(() => useTeacherApplication());

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetMyApplication).not.toHaveBeenCalled();
  });
});
