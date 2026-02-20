import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { defaultFormState, type ProfileFormState } from "@/lib/types/profile";

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
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("starts with isSaving false and no error", () => {
    const mutate = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error when API returns non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { message: "Please sign in again to save your profile." },
        }),
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

  it("calls fetch with correct data and calls onSuccess callback", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const mutate = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    await act(async () => {
      await result.current.handleSubmit(createFakeEvent(), fakeForm);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/profiles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: expect.any(String),
    });

    const sentBody = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(sentBody.fullName).toBe("Test User");
    expect(sentBody.locationMode).toBe("remote");

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error on upsert failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({ error: { message: "Failed to save profile" } }),
    });

    const mutate = vi.fn();
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSave(mutate, onSuccess));

    await act(async () => {
      await result.current.handleSubmit(createFakeEvent(), fakeForm);
    });

    expect(result.current.error).toBe("Failed to save profile");
    expect(result.current.isSaving).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
