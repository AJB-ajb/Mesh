import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

const fetchMock = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 0,
        provider: () => new Map(),
        fetcher: fetchMock,
      }}
    >
      {children}
    </SWRConfig>
  );
}

import { useFriendships } from "../use-friendships";

const fakeFriendships = [
  {
    id: "f1",
    user_id: "user-1",
    friend_id: "user-2",
    status: "accepted",
    created_at: "2026-01-01T00:00:00Z",
    friend: { user_id: "user-2", full_name: "Bob", headline: "Designer" },
    user: { user_id: "user-1", full_name: "Alice", headline: "Dev" },
  },
];

describe("useFriendships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFriendships(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.friendships).toEqual([]);
  });

  it("fetches friendships successfully", async () => {
    fetchMock.mockResolvedValue({ friendships: fakeFriendships });

    const { result } = renderHook(() => useFriendships(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friendships).toHaveLength(1);
    expect(result.current.friendships[0].friend?.full_name).toBe("Bob");
    expect(result.current.error).toBeUndefined();
  });

  it("handles fetch error", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFriendships(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.friendships).toEqual([]);
  });

  it("provides mutate for revalidation", async () => {
    fetchMock.mockResolvedValue({ friendships: fakeFriendships });

    const { result } = renderHook(() => useFriendships(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.mutate).toBe("function");
  });
});
