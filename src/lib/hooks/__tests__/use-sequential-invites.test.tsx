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

import { useSequentialInvites } from "../use-sequential-invites";

const fakeSequentialInvites = [
  {
    id: "fa1",
    posting_id: "p1",
    creator_id: "user-1",
    ordered_friend_list: ["f1", "f2"],
    current_request_index: 0,
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    posting: { id: "p1", title: "Study Group", status: "open" },
  },
];

describe("useSequentialInvites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSequentialInvites(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.sequentialInvites).toEqual([]);
  });

  it("fetches sequential invites successfully", async () => {
    fetchMock.mockResolvedValue({ friend_asks: fakeSequentialInvites });

    const { result } = renderHook(() => useSequentialInvites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sequentialInvites).toHaveLength(1);
    expect(result.current.sequentialInvites[0].posting?.title).toBe(
      "Study Group",
    );
    expect(result.current.error).toBeUndefined();
  });

  it("handles fetch error", async () => {
    fetchMock.mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useSequentialInvites(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.sequentialInvites).toEqual([]);
  });

  it("defaults to empty array when no data", async () => {
    fetchMock.mockResolvedValue({});

    const { result } = renderHook(() => useSequentialInvites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sequentialInvites).toEqual([]);
  });
});
