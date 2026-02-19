import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ProfileFetchResult } from "../use-profile-data";
import { defaultFormState } from "@/lib/types/profile";

// No SWR wrapper needed — this hook does not use SWR internally.

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

import { useProfileForm } from "../use-profile-form";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeProfileData: ProfileFetchResult = {
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
// Tests
// ---------------------------------------------------------------------------

describe("useProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profileData.form when not editing", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    expect(result.current.isEditing).toBe(false);
    expect(result.current.form).toEqual(fakeProfileData.form);
  });

  it("returns defaultFormState when profileData is undefined", () => {
    const { result } = renderHook(() => useProfileForm(undefined));

    expect(result.current.form).toEqual(defaultFormState);
  });

  it("startEditing snapshots current form into localDraft", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => {
      result.current.startEditing();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.form).toEqual(fakeProfileData.form);
  });

  it("handleChange updates localDraft during editing", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange("fullName", "New Name");
    });

    expect(result.current.form.fullName).toBe("New Name");
    // Other fields remain unchanged
    expect(result.current.form.headline).toBe("Developer");
  });

  it("cancelEditing discards draft and returns to SWR data", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    act(() => {
      result.current.startEditing();
    });

    act(() => {
      result.current.handleChange("fullName", "Changed Name");
    });

    expect(result.current.form.fullName).toBe("Changed Name");

    act(() => {
      result.current.cancelEditing();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.form).toEqual(fakeProfileData.form);
  });

  it("setForm works for external callers (use-github-sync compatibility)", () => {
    const { result } = renderHook(() => useProfileForm(fakeProfileData));

    // setForm should work even when not editing — it writes to localDraft
    act(() => {
      result.current.setForm({ ...defaultFormState, fullName: "External Set" });
    });

    // Since we are not editing, the form still reads from profileData
    // But setForm updates the internal draft for when editing is started
    expect(result.current.isEditing).toBe(false);

    // setForm with function updater
    act(() => {
      result.current.setForm((prev) => ({ ...prev, bio: "Updated bio" }));
    });

    // Verify it doesn't throw and the hook remains stable
    expect(result.current.form).toEqual(fakeProfileData.form);
  });
});
