import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { defaultFormState, type ProfileFormState } from "@/lib/types/profile";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/api/trigger-embedding", () => ({
  triggerEmbeddingGeneration: vi.fn(),
}));

import { useProfileAiUpdate } from "../use-profile-ai-update";

const fakeForm: ProfileFormState = {
  ...defaultFormState,
  fullName: "Test User",
  headline: "Developer",
  bio: "I build things",
  skills: "React, TypeScript",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useProfileAiUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with isApplyingUpdate false", () => {
    const mutate = vi.fn();

    const { result } = renderHook(() =>
      useProfileAiUpdate(fakeForm, null, mutate),
    );

    expect(result.current.isApplyingUpdate).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error if user not authenticated during applyFreeFormUpdate", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const mutate = vi.fn();

    const { result } = renderHook(() =>
      useProfileAiUpdate(fakeForm, null, mutate),
    );

    await act(async () => {
      await result.current.applyFreeFormUpdate("new text", {
        full_name: "New Name",
      });
    });

    expect(result.current.error).toBe("Please sign in again.");
    expect(result.current.isApplyingUpdate).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("sets error if user not authenticated during undoLastUpdate", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const mutate = vi.fn();

    const { result } = renderHook(() =>
      useProfileAiUpdate(fakeForm, "old source", mutate),
    );

    await act(async () => {
      await result.current.undoLastUpdate();
    });

    expect(result.current.error).toBe("Please sign in again.");
    expect(result.current.isApplyingUpdate).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("calls mutate after successful update", async () => {
    const fakeUser = { id: "user-1" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: upsertMock,
    });

    const mutate = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useProfileAiUpdate(fakeForm, "old source text", mutate),
    );

    await act(async () => {
      await result.current.applyFreeFormUpdate("updated text", {
        full_name: "Updated Name",
        interests: ["AI", "ML"],
      });
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(result.current.isApplyingUpdate).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.success).toBe(true);
  });
});
