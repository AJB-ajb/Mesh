import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getUserTier, canAccessFeature } from "../index";

describe("getUserTier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'free' when profile has no tier", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tier: null },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockClient as never);

    const tier = await getUserTier("user-1");
    expect(tier).toBe("free");
  });

  it("returns 'premium' when profile has premium tier", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tier: "premium" },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockClient as never);

    const tier = await getUserTier("user-1");
    expect(tier).toBe("premium");
  });

  it("returns 'free' when profile not found", async () => {
    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Not found" },
            }),
          }),
        }),
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockClient as never);

    const tier = await getUserTier("nonexistent");
    expect(tier).toBe("free");
  });
});

describe("canAccessFeature", () => {
  it("free users cannot access deepMatchExplanation", () => {
    expect(canAccessFeature("free", "deepMatchExplanation")).toBe(false);
  });

  it("premium users can access deepMatchExplanation", () => {
    expect(canAccessFeature("premium", "deepMatchExplanation")).toBe(true);
  });

  it("free users cannot access onDemandExplanation", () => {
    expect(canAccessFeature("free", "onDemandExplanation")).toBe(false);
  });

  it("premium users can access onDemandExplanation", () => {
    expect(canAccessFeature("premium", "onDemandExplanation")).toBe(true);
  });
});
