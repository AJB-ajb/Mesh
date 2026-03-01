"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { usePostings, type PostingWithScore } from "./use-postings";
import { useActivePostings, type ActivePosting } from "./use-active-postings";
import { getUserOrThrow } from "@/lib/supabase/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PostsPageFilter =
  | "all"
  | "created"
  | "joined"
  | "applied"
  | "completed";

export type PostsPageItem =
  | { kind: "owned"; data: PostingWithScore }
  | { kind: "active"; data: ActivePosting };

// ---------------------------------------------------------------------------
// Applied-postings fetcher (pending/waitlisted applications)
// ---------------------------------------------------------------------------

async function fetchAppliedPostingIds(): Promise<string[]> {
  const { supabase, user } = await getUserOrThrow();

  const { data } = await supabase
    .from("applications")
    .select("posting_id")
    .eq("applicant_id", user.id)
    .in("status", ["pending", "waitlisted"])
    .limit(100);

  return (data ?? []).map((a) => a.posting_id);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePostsPage() {
  const [activeFilter, setActiveFilter] = useState<PostsPageFilter>("all");

  const {
    postings: ownedPostings,
    userId,
    isLoading: isLoadingOwned,
  } = usePostings("my-postings");

  const { postings: activePostings, isLoading: isLoadingActive } =
    useActivePostings();

  // Fetch applied posting IDs only when needed
  const { data: appliedIds, isLoading: isLoadingApplied } = useSWR(
    activeFilter === "applied" || activeFilter === "all"
      ? "posts-page-applied-ids"
      : null,
    fetchAppliedPostingIds,
  );

  const isLoading =
    isLoadingOwned ||
    isLoadingActive ||
    ((activeFilter === "applied" || activeFilter === "all") &&
      isLoadingApplied);

  const posts = useMemo(() => {
    const items: PostsPageItem[] = [];
    const seenIds = new Set<string>();

    // Owned postings (user created these)
    for (const p of ownedPostings) {
      seenIds.add(p.id);
      items.push({ kind: "owned", data: p });
    }

    // Joined active postings (accepted member, not creator)
    for (const p of activePostings) {
      if (!seenIds.has(p.id) && p.role === "joined") {
        seenIds.add(p.id);
        items.push({ kind: "active", data: p });
      }
    }

    switch (activeFilter) {
      case "created":
        return items.filter((item) => item.kind === "owned");
      case "joined":
        return items.filter((item) => item.kind === "active");
      case "applied": {
        const idSet = new Set(appliedIds ?? []);
        return items.filter((item) => {
          const id = item.kind === "owned" ? item.data.id : item.data.id;
          return idSet.has(id);
        });
      }
      case "completed":
        return items.filter((item) => {
          const status =
            item.kind === "owned" ? item.data.status : item.data.status;
          return status === "filled" || status === "closed";
        });
      default:
        return items;
    }
  }, [ownedPostings, activePostings, activeFilter, appliedIds]);

  return {
    posts,
    isLoading,
    activeFilter,
    setActiveFilter,
    userId,
  };
}
