import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLinkIdentity = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      linkIdentity: mockLinkIdentity,
    },
  }),
}));

import { useProfileProviders } from "../use-profile-providers";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useProfileProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no error", () => {
    const { result } = renderHook(() => useProfileProviders());

    expect(result.current.error).toBeNull();
  });

  it("calls linkIdentity with correct provider and redirect", async () => {
    mockLinkIdentity.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useProfileProviders());

    await act(async () => {
      await result.current.handleLinkProvider("github");
    });

    expect(mockLinkIdentity).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    expect(result.current.error).toBeNull();
  });

  it("sets error message on linkIdentity failure", async () => {
    mockLinkIdentity.mockResolvedValue({
      error: { message: "Provider already linked" },
    });

    const { result } = renderHook(() => useProfileProviders());

    await act(async () => {
      await result.current.handleLinkProvider("google");
    });

    expect(result.current.error).toBe(
      "Failed to link google: Provider already linked",
    );
  });
});
