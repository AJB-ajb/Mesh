import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SkillGapPrompt } from "../skill-gap-prompt";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock SWR — return user skills immediately
const mockUserSkills: string[] = [];

vi.mock("swr", () => ({
  default: () => ({
    data: mockUserSkills.length > 0 ? mockUserSkills : ["React", "TypeScript"],
  }),
}));

// Mock Supabase client (required by module but not called due to SWR mock)
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

// Mock deriveSkillNames (required by module but not called due to SWR mock)
vi.mock("@/lib/skills/derive", () => ({
  deriveSkillNames: () => [],
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SkillGapPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
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

  it("returns null when no skill gaps exist", () => {
    // Posting requires React, TypeScript — user has both
    const { container } = render(
      <SkillGapPrompt
        postingId="p-1"
        postingSkills={["React", "TypeScript"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows card when there are gap skills", () => {
    render(
      <SkillGapPrompt
        postingId="p-2"
        postingSkills={["React", "TypeScript", "Python", "Go"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    // "Python" and "Go" are gap skills
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("displays gap skill names in the title for single skill", () => {
    render(
      <SkillGapPrompt
        postingId="p-3"
        postingSkills={["React", "TypeScript", "Rust"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    // Only "Rust" is a gap
    expect(screen.getByText("Rust")).toBeInTheDocument();
    // Title contains "experience" — use getAllByText to verify at least one match
    const matches = screen.getAllByText(/experience/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("displays two gap skills correctly", () => {
    render(
      <SkillGapPrompt
        postingId="p-4"
        postingSkills={["React", "Python", "Go"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
  });

  it("submit button calls API with text", async () => {
    const onProfileUpdated = vi.fn();
    render(
      <SkillGapPrompt
        postingId="p-5"
        postingSkills={["React", "Python"]}
        currentUserId="user-1"
        onProfileUpdated={onProfileUpdated}
      />,
    );

    const textarea = screen.getByPlaceholderText(/learning Machine Learning/);
    fireEvent.change(textarea, {
      target: { value: "I know Python from data science projects" },
    });

    const submitBtn = screen.getByText("Add to Profile");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/extract/profile/update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(
            "I know Python from data science projects",
          ),
        }),
      );
    });
  });

  it("dismiss button hides the card", () => {
    const { container } = render(
      <SkillGapPrompt
        postingId="p-6"
        postingSkills={["React", "Python"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    const dismissBtn = screen.getByLabelText("Dismiss skill gap prompt");
    fireEvent.click(dismissBtn);

    expect(container.innerHTML).toBe("");
  });

  it("dismissed state persists to localStorage", () => {
    render(
      <SkillGapPrompt
        postingId="p-7"
        postingSkills={["React", "Python"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );

    const dismissBtn = screen.getByLabelText("Dismiss skill gap prompt");
    fireEvent.click(dismissBtn);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "skill-gap-dismissed-p-7",
      "true",
    );
  });

  it("returns null when posting has no skills", () => {
    const { container } = render(
      <SkillGapPrompt
        postingId="p-8"
        postingSkills={[]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("skill comparison is case-insensitive", () => {
    // User has "React" and "TypeScript", posting requires "react" and "typescript"
    const { container } = render(
      <SkillGapPrompt
        postingId="p-9"
        postingSkills={["react", "typescript"]}
        currentUserId="user-1"
        onProfileUpdated={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
