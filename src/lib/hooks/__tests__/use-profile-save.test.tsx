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

import { useProfileSave } from "../use-profile-save";

function createFakeEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.FormEvent<HTMLFormElement>;
}

const fakeForm: ProfileFormState = {
  ...defaultFormState,
  fullName: "Test User",
  headline: "Developer",
  bio: "I build things",
  skills: "React, TypeScript",
  interests: "AI",
  languages: "English",
  skillLevels: [{ name: "React", level: 8 }],
  locationMode: "remote",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useProfileSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with isSaving false and no error", () => {
    const mutate = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error if user not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const mutate = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    await act(async () => {
      await result.current.handleSubmit(createFakeEvent(), fakeForm);
    });

    expect(result.current.error).toBe(
      "Please sign in again to save your profile.",
    );
    expect(result.current.isSaving).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("calls upsert with correct data and calls onSuccess callback", async () => {
    const fakeUser = { id: "user-1", email: "user@test.com" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return { upsert: upsertMock, update: updateMock };
      if (table === "profile_skills")
        return { delete: deleteMock, insert: insertMock };
      return {};
    });

    const mutate = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    await act(async () => {
      await result.current.handleSubmit(createFakeEvent(), fakeForm);
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const upsertArgs = upsertMock.mock.calls[0];
    expect(upsertArgs[0].user_id).toBe("user-1");
    expect(upsertArgs[0].full_name).toBe("Test User");
    expect(upsertArgs[0].skills).toBeUndefined(); // no longer dual-written
    expect(upsertArgs[0].skill_levels).toBeUndefined(); // no longer dual-written
    expect(upsertArgs[0].location_mode).toBe("remote");

    // Verify needs_embedding is set
    expect(updateMock).toHaveBeenCalledWith({ needs_embedding: true });
    expect(upsertArgs[1]).toEqual({ onConflict: "user_id" });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error on upsert failure", async () => {
    const fakeUser = { id: "user-1", email: "user@test.com" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const upsertMock = vi
      .fn()
      .mockResolvedValue({ error: { message: "DB error" } });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return { upsert: upsertMock };
      return {};
    });

    const mutate = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    await act(async () => {
      await result.current.handleSubmit(createFakeEvent(), fakeForm);
    });

    expect(result.current.error).toBe(
      "We couldn't save your profile. Please try again.",
    );
    expect(result.current.isSaving).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
