import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignOut = vi.fn();
const mockReplace = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { useSignOut } from "../use-sign-out";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSignOut", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signOut and redirects to login", async () => {
    mockSignOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  });
});
