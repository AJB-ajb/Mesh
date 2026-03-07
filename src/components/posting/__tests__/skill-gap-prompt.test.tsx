import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks — minimal: just enough to stop network calls
// ---------------------------------------------------------------------------

// Use an object wrapper so the hoisted vi.mock can read current value
const swrState = { userSkills: ["React", "TypeScript"] as string[] | null };

vi.mock("swr", () => ({
  default: () => ({
    data: swrState.userSkills,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

vi.mock("@/lib/skills/derive", () => ({
  deriveSkillNames: () => [],
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { SkillGapPrompt } from "../skill-gap-prompt";

// ---------------------------------------------------------------------------
// Tests — focused on skill gap calculation, display conditions, interactions
// ---------------------------------------------------------------------------

describe("SkillGapPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState.userSkills = ["React", "TypeScript"];
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          updatedSourceText: "",
          extractedProfile: {},
        }),
    });
  });

  // -----------------------------------------------------------------------
  // Skill gap calculation: which skills show as gaps
  // -----------------------------------------------------------------------

  it("renders nothing when user has all required skills", () => {
    const { container } = render(
      <SkillGapPrompt
        postingId="p-1"
        postingSkills={["React", "TypeScript"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("identifies skills the user is missing", () => {
    render(
      <SkillGapPrompt
        postingId="p-2"
        postingSkills={["React", "Python", "Go"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("skill comparison is case-insensitive", () => {
    const { container } = render(
      <SkillGapPrompt
        postingId="p-3"
        postingSkills={["react", "typescript"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    // user has "React"/"TypeScript", posting asks for "react"/"typescript" — no gap
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when posting has no skills", () => {
    const { container } = render(
      <SkillGapPrompt
        postingId="p-4"
        postingSkills={[]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing while user skills are still loading (null)", () => {
    swrState.userSkills = null;

    const { container } = render(
      <SkillGapPrompt
        postingId="p-5"
        postingSkills={["Python"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  // -----------------------------------------------------------------------
  // Dismiss logic — persists to localStorage
  // -----------------------------------------------------------------------

  it("dismiss hides the card and writes to localStorage", () => {
    const { container } = render(
      <SkillGapPrompt
        postingId="p-6"
        postingSkills={["Python"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    // Card is visible
    expect(screen.getByText("Python")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss skill gap prompt"));

    // Card gone
    expect(container.innerHTML).toBe("");
    // Persisted
    expect(localStorage.getItem("skill-gap-dismissed-p-6")).toBe("true");
  });

  it("does not render if previously dismissed for this posting", async () => {
    localStorage.setItem("skill-gap-dismissed-p-7", "true");

    const { container } = render(
      <SkillGapPrompt
        postingId="p-7"
        postingSkills={["Python"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    // The component checks localStorage inside useEffect + queueMicrotask,
    // so we need to wait for the state update to propagate
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  // -----------------------------------------------------------------------
  // Submit flow — sends text to profile update API
  // -----------------------------------------------------------------------

  it("submits user text to the profile update endpoint", async () => {
    render(
      <SkillGapPrompt
        postingId="p-8"
        postingSkills={["Python"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    const textarea = screen.getByPlaceholderText(/learning Machine Learning/);
    fireEvent.change(textarea, {
      target: { value: "I used Python for data analysis" },
    });

    fireEvent.click(screen.getByText("Add to Profile"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/extract/profile/update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("I used Python for data analysis"),
        }),
      );
    });
  });

  it("submit button is disabled when textarea is empty", () => {
    render(
      <SkillGapPrompt
        postingId="p-9"
        postingSkills={["Python"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    const submitBtn = screen.getByText("Add to Profile");
    expect(submitBtn).toBeDisabled();
  });

  it("shows success state after a successful submission", async () => {
    render(
      <SkillGapPrompt
        postingId="p-10"
        postingSkills={["Python"]}
        currentUserId="u-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/learning Machine Learning/), {
      target: { value: "some text" },
    });
    fireEvent.click(screen.getByText("Add to Profile"));

    await waitFor(() => {
      expect(
        screen.getByText("Skills added to your profile!"),
      ).toBeInTheDocument();
    });
  });
});
