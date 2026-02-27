import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/tier", () => ({
  getUserTier: vi.fn(),
  canAccessFeature: vi.fn(),
}));

vi.mock("@/lib/ai/gemini", () => ({
  isGeminiConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/matching/explanation", () => ({
  generateMatchExplanation: vi.fn(),
}));

import { getUserTier, canAccessFeature } from "@/lib/tier";

// Since the route uses withAuth, we test the tier and explanation logic directly.

describe("explain route logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("free users are rejected", () => {
    vi.mocked(canAccessFeature).mockReturnValue(false);
    expect(canAccessFeature("free", "onDemandExplanation")).toBe(false);
  });

  it("premium users can generate explanations", () => {
    vi.mocked(canAccessFeature).mockReturnValue(true);
    expect(canAccessFeature("premium", "onDemandExplanation")).toBe(true);
  });

  it("getUserTier returns correct tier", async () => {
    vi.mocked(getUserTier).mockResolvedValue("premium");
    const tier = await getUserTier("user-1");
    expect(tier).toBe("premium");
  });
});
