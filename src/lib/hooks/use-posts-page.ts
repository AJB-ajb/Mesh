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
  role: "owner" | "joined" | "applied";
  acceptedCount?: number;
  unreadCount?: number;
  href: string;
};

// ---------------------------------------------------------------------------
// Applied-postings fetcher (pending/waitlisted join requests)
// ---------------------------------------------------------------------------

type AppliedPosting = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string | null;
  team_size_min: number;
  team_size_max: number;
  created_at: string;
  creator_id: string;
};

async function fetchAppliedPostings(): Promise<AppliedPosting[]> {
  const { supabase, user } = await getUserOrThrow();

  const { data: applications } = await supabase
    .from("applications")
    .select("posting_id")
    .eq("applicant_id", user.id)
    .in("status", ["pending", "waitlisted"])
    .limit(100);

  const postingIds = (applications ?? []).map((a) => a.posting_id);
  if (postingIds.length === 0) return [];

  const { data: postings } = await supabase
    .from("postings")
    .select(
      "id, title, description, status, category, team_size_min, team_size_max, created_at, creator_id",
    )
    .in("id", postingIds);

  return (postings ?? []) as AppliedPosting[];
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

  // Fetch applied postings only when needed
  const { data: appliedPostings, isLoading: isLoadingApplied } = useSWR(
    activeFilter === "applied" || activeFilter === "all"
      ? "posts-page-applied"
      : null,
    fetchAppliedPostings,
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

    // Applied postings (pending/waitlisted join requests)
    for (const p of appliedPostings ?? []) {
      if (!seenIds.has(p.id)) {
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
          role: "applied",
          href: `/postings/${p.id}`,
        });
      }
    }

    switch (activeFilter) {
      case "created":
        return items.filter((item) => item.role === "owner");
      case "joined":
        return items.filter((item) => item.role === "joined");
      case "applied":
        return items.filter((item) => item.role === "applied");
      case "completed":
        return items.filter(
          (item) => item.status === "filled" || item.status === "closed",
        );
      default:
        return items;
    }
  }, [ownedPostings, activePostings, activeFilter, appliedPostings]);

  return {
    posts,
    isLoading,
    activeFilter,
    setActiveFilter,
  };
}
