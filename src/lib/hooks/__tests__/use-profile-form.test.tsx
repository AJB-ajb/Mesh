import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ProfileFetchResult } from "../use-profile-data";
import { defaultFormState } from "@/lib/types/profile";

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { useProfileForm } from "../use-profile-form";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeProfileData: ProfileFetchResult = {
  profileId: "test-user-id",
  form: {
    fullName: "Test User",
    headline: "Developer",
    bio: "I build things",
    location: "San Francisco",
    locationLat: "37.7749",
    locationLng: "-122.4194",
    skills: "React, TypeScript",
    interests: "AI, Web",
    languages: "English",
    portfolioUrl: "https://example.com",
    githubUrl: "https://github.com/test",
    skillLevels: [{ name: "React", level: 8 }],
    locationMode: "remote",
    availabilitySlots: { mon: ["morning"] },
    timezone: "",
    selectedSkills: [],
  },
  recurringWindows: [],
  userEmail: "user@test.com",
  connectedProviders: { github: true, google: false, linkedin: false },
  isGithubProvider: true,
  sourceText: "I am a developer",
  canUndo: false,
};

// ---------------------------------------------------------------------------
// Tests — draft snapshot/restore logic
// ---------------------------------------------------------------------------

describe("useProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("startEditing snapshots profileData.form into a mutable draft", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => result.current.startEditing());

    // Draft is a copy of the original form
    expect(result.current.form).toEqual(fakeProfileData.form);
    expect(result.current.isEditing).toBe(true);
  });

  it("handleChange mutates the draft without affecting the original data", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => result.current.startEditing());
    act(() => result.current.handleChange("fullName", "Changed Name"));

    expect(result.current.form.fullName).toBe("Changed Name");
    // The profileData object itself was never modified
    expect(fakeProfileData.form.fullName).toBe("Test User");
  });

  it("handleChange is a no-op when not editing", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => result.current.handleChange("fullName", "Ignored"));

    // Form still reflects the original profileData
    expect(result.current.form.fullName).toBe("Test User");
  });

  it("cancelEditing discards all draft changes and restores the original form", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => result.current.startEditing());
    act(() => result.current.handleChange("fullName", "Changed Name"));
    act(() => result.current.handleChange("bio", "Changed bio"));

    // Verify changes took effect in the draft
    expect(result.current.form.fullName).toBe("Changed Name");

    act(() => result.current.cancelEditing());

    // All changes discarded — form is back to the SWR data
    expect(result.current.isEditing).toBe(false);
    expect(result.current.form).toEqual(fakeProfileData.form);
  });

  it("setIsEditing(true) then setIsEditing(false) round-trips cleanly", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => result.current.setIsEditing(true));
    act(() => result.current.handleChange("headline", "New"));
    act(() => result.current.setIsEditing(false));

    expect(result.current.isEditing).toBe(false);
    expect(result.current.form.headline).toBe("Developer");
  });

  it("setForm writes to the internal draft (use-github-sync compatibility)", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    // setForm should update draft even when not editing
    act(() => {
      result.current.setForm({ ...defaultFormState, fullName: "External Set" });
    });

    // Start editing — the draft was already written by setForm
    act(() => result.current.startEditing());

    // But startEditing re-snapshots from profileData, overwriting the setForm call
    // This is the expected behavior per the source code
    expect(result.current.form.fullName).toBe("Test User");
  });

  it("setForm with function updater composes on current draft", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => result.current.startEditing());
    act(() => {
      result.current.setForm((prev) => ({ ...prev, bio: "Updated bio" }));
    });

    expect(result.current.form.bio).toBe("Updated bio");
    // Other fields untouched
    expect(result.current.form.fullName).toBe("Test User");
  });

  it("re-entering edit mode after cancel re-snapshots fresh data", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useProfileForm(data),
      { initialProps: { data: fakeProfileData } },
    );

    // First edit cycle
    act(() => result.current.startEditing());
    act(() => result.current.handleChange("fullName", "Draft 1"));
    act(() => result.current.cancelEditing());

    // Simulate SWR updating the profileData externally
    const updatedData: ProfileFetchResult = {
      ...fakeProfileData,
      form: { ...fakeProfileData.form, fullName: "Server Updated" },
    };
    rerender({ data: updatedData });

    // Second edit cycle should snapshot the NEW data, not the old
    act(() => result.current.startEditing());
    expect(result.current.form.fullName).toBe("Server Updated");
  });
});
