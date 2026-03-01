"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { usePostings } from "./use-postings";
import { useActivePostings } from "./use-active-postings";
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

export type PostsCardData = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string | null;
  teamSizeMin: number;
  teamSizeMax: number;
  createdAt: string;
  creatorId: string;
  role: "owner" | "joined";
  acceptedCount?: number;
  unreadCount?: number;
  href: string;
};

// ---------------------------------------------------------------------------
// Applied-postings fetcher (pending/waitlisted join requests)
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

  const { postings: ownedPostings, isLoading: isLoadingOwned } =
    usePostings("my-postings");

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
    const items: PostsCardData[] = [];
    const seenIds = new Set<string>();

    // Owned postings (user created these)
    for (const p of ownedPostings) {
      seenIds.add(p.id);
      items.push({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        category: p.category,
        teamSizeMin: p.team_size_min,
        teamSizeMax: p.team_size_max,
        createdAt: p.created_at,
        creatorId: p.creator_id,
        role: "owner",
        href: `/postings/${p.id}`,
      });
    }

    // Joined active postings (accepted member, not creator)
    for (const p of activePostings) {
      if (!seenIds.has(p.id) && p.role === "joined") {
        seenIds.add(p.id);
        items.push({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          category: p.category,
          teamSizeMin: p.team_size_min,
          teamSizeMax: p.team_size_max,
          createdAt: p.created_at,
          creatorId: p.creator_id,
          role: "joined",
          acceptedCount: p.acceptedCount,
          unreadCount: p.unreadCount,
          href: `/postings/${p.id}?tab=project`,
        });
      }
    }

    switch (activeFilter) {
      case "created":
        return items.filter((item) => item.role === "owner");
      case "joined":
        return items.filter((item) => item.role === "joined");
      case "applied": {
        const idSet = new Set(appliedIds ?? []);
        return items.filter((item) => idSet.has(item.id));
      }
      case "completed":
        return items.filter(
          (item) => item.status === "filled" || item.status === "closed",
        );
      default:
        return items;
    }
  }, [ownedPostings, activePostings, activeFilter, appliedIds]);

  return {
    posts,
    isLoading,
    activeFilter,
    setActiveFilter,
  };
}
