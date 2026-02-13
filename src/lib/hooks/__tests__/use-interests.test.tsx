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

import { useInterests } from "../use-interests";

const fakeMyInterests = [
  {
    id: "i1",
    posting_id: "p1",
    similarity_score: 0.85,
    status: "interested",
    created_at: "2026-01-01T00:00:00Z",
    postings: {
      id: "p1",
      title: "Project A",
      description: "A project",
      skills: ["React"],
      category: "hackathon",
      mode: "open",
      status: "open",
      creator_id: "other-user",
      created_at: "2026-01-01T00:00:00Z",
    },
  },
];

const fakeInterestsReceived = [
  {
    id: "i2",
    posting_id: "p2",
    user_id: "user-2",
    similarity_score: 0.9,
    status: "interested",
    created_at: "2026-01-02T00:00:00Z",
    postings: {
      id: "p2",
      title: "My Project",
      description: "My project",
      skills: ["Node"],
      category: "personal",
      mode: "open",
      status: "open",
      creator_id: "user-1",
      created_at: "2026-01-01T00:00:00Z",
    },
    profiles: {
      full_name: "User 2",
      user_id: "user-2",
      headline: "Backend Dev",
      skills: ["Node", "Python"],
    },
  },
];

describe("useInterests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useInterests(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.myInterests).toEqual([]);
    expect(result.current.interestsReceived).toEqual([]);
  });

  it("fetches interests successfully", async () => {
    fetchMock.mockResolvedValue({
      myInterests: fakeMyInterests,
      interestsReceived: fakeInterestsReceived,
    });

    const { result } = renderHook(() => useInterests(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.myInterests).toHaveLength(1);
    expect(result.current.myInterests[0].similarity_score).toBe(0.85);
    expect(result.current.interestsReceived).toHaveLength(1);
    expect(result.current.interestsReceived[0].profiles.full_name).toBe(
      "User 2",
    );
  });

  it("handles fetch error", async () => {
    fetchMock.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useInterests(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.myInterests).toEqual([]);
    expect(result.current.interestsReceived).toEqual([]);
  });

  it("defaults to empty arrays when data is missing", async () => {
    fetchMock.mockResolvedValue({});

    const { result } = renderHook(() => useInterests(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.myInterests).toEqual([]);
    expect(result.current.interestsReceived).toEqual([]);
  });
});
