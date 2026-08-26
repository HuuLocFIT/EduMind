import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { UserRole } from "@edumind/shared-constants";
import { useTeacherRoleSync } from "./useTeacherRoleSync";

vi.mock("../stores/auth.store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../stores/auth.store")>();
  return {
    ...actual,
    useAuthStore: vi.fn(),
  };
});

import {
  useAuthStore,
  markGuardAttempted,
  resetRoleSyncAttempts,
} from "../stores/auth.store";

const mockAuthStore = vi.mocked(useAuthStore);
const mockRefreshSession = vi.fn();

const setStoreState = (roles: string[]) => {
  mockAuthStore.mockReturnValue({
    user: { id: 1, roles },
    refreshSession: mockRefreshSession,
    isRefreshingSession: false,
    sessionRefreshError: null,
  } as unknown as ReturnType<typeof useAuthStore>);
};

describe("useTeacherRoleSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRoleSyncAttempts();
  });

  it("calls refreshSession exactly once when APPROVED with only ROLE_STUDENT", () => {
    setStoreState([UserRole.STUDENT]);

    renderHook(() => useTeacherRoleSync({ applicationId: 1, status: "APPROVED" }));

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not fire a second refresh on rerender while the first is still in flight", () => {
    setStoreState([UserRole.STUDENT]);

    const { rerender } = renderHook(
      (props: { applicationId: number; status: string }) => useTeacherRoleSync(props),
      { initialProps: { applicationId: 1, status: "APPROVED" } },
    );

    // Simulates a query refetch / parent rerender with the same application data.
    rerender({ applicationId: 1, status: "APPROVED" });
    rerender({ applicationId: 1, status: "APPROVED" });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("fires only once when mounted twice at the same time (MainLayout + ApplicationStatusPage)", () => {
    setStoreState([UserRole.STUDENT]);

    // Both hooks compute needsSync=true in the same render pass; the child's effect runs
    // first and marks the flag, so the parent must re-read it rather than trust the
    // needsSync captured in its own closure.
    renderHook(() => {
      useTeacherRoleSync({ applicationId: 1, status: "APPROVED" });
      useTeacherRoleSync({ applicationId: 1, status: "APPROVED" });
    });

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("does not refresh when the user already has TEACHER role", () => {
    setStoreState([UserRole.STUDENT, UserRole.TEACHER]);

    const { result } = renderHook(() =>
      useTeacherRoleSync({ applicationId: 1, status: "APPROVED" }),
    );

    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(result.current.hasTeacherRole).toBe(true);
  });

  it("does not refresh when the user already has TEACHER_TRIAL role", () => {
    setStoreState([UserRole.STUDENT, UserRole.TEACHER_TRIAL]);

    renderHook(() => useTeacherRoleSync({ applicationId: 1, status: "APPROVED" }));

    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("does not refresh while PENDING", () => {
    setStoreState([UserRole.STUDENT]);

    renderHook(() => useTeacherRoleSync({ applicationId: 1, status: "PENDING" }));

    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("does not refresh while REJECTED", () => {
    setStoreState([UserRole.STUDENT]);

    renderHook(() => useTeacherRoleSync({ applicationId: 1, status: "REJECTED" }));

    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("does not refresh when applicationId is undefined", () => {
    setStoreState([UserRole.STUDENT]);

    renderHook(() => useTeacherRoleSync({ applicationId: undefined, status: "APPROVED" }));

    expect(mockRefreshSession).not.toHaveBeenCalled();
  });

  it("still runs the approval sync even if the guard already attempted a sync for this user", () => {
    setStoreState([UserRole.STUDENT]);
    // Simulate TeacherGuard having already attempted a sync for this user id — a
    // regression test for the "lost sync after approval" scenario: the guard and
    // approval flags must dedupe independently (guard on user.id, approval on
    // application.id), or a guard attempt made before approval would suppress the
    // sync that must run right after the application gets approved.
    markGuardAttempted(1);

    renderHook(() => useTeacherRoleSync({ applicationId: 1, status: "APPROVED" }));

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });
});
