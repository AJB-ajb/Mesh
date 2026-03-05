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
  | "invited"
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
  role: "owner" | "joined" | "applied" | "invited";
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
// Invited-postings fetcher (pending invites from friend_asks)
// ---------------------------------------------------------------------------

type InvitedPosting = {
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

async function fetchInvitedPostings(): Promise<InvitedPosting[]> {
  const { supabase, user } = await getUserOrThrow();

  // Find friend_asks where user is in pending_invitees (sequential) or
  // ordered_friend_list minus declined_list (parallel)
  const { data: friendAsks } = await supabase
    .from("friend_asks")
    .select("posting_id, ordered_friend_list, pending_invitees, declined_list, invite_mode")
    .eq("status", "pending");

  if (!friendAsks || friendAsks.length === 0) return [];

  // Filter to friend_asks where this user is actually an active invitee
  const invitedPostingIds: string[] = [];
  for (const fa of friendAsks) {
    const inviteMode = fa.invite_mode ?? "sequential";
    const declinedList: string[] = fa.declined_list ?? [];
    if (declinedList.includes(user.id)) continue;

    if (inviteMode === "parallel") {
      if (fa.ordered_friend_list.includes(user.id)) {
        invitedPostingIds.push(fa.posting_id);
      }
    } else {
      const pendingInvitees: string[] = fa.pending_invitees ?? [];
      if (pendingInvitees.includes(user.id)) {
        invitedPostingIds.push(fa.posting_id);
      }
    }
  }

  if (invitedPostingIds.length === 0) return [];

  const { data: postings } = await supabase
    .from("postings")
    .select(
      "id, title, description, status, category, team_size_min, team_size_max, created_at, creator_id",
    )
    .in("id", invitedPostingIds);

  return (postings ?? []) as InvitedPosting[];
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

  const { data: invitedPostings, isLoading: isLoadingInvited } = useSWR(
    activeFilter === "invited" || activeFilter === "all"
      ? "posts-page-invited"
      : null,
    fetchInvitedPostings,
  );

  const isLoading =
    isLoadingOwned ||
    isLoadingActive ||
    ((activeFilter === "applied" || activeFilter === "all") &&
      isLoadingApplied) ||
    ((activeFilter === "invited" || activeFilter === "all") &&
      isLoadingInvited);

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

    // Invited postings (pending invites from friend_asks)
    for (const p of invitedPostings ?? []) {
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
          role: "invited",
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
      case "invited":
        return items.filter((item) => item.role === "invited");
      case "completed":
        return items.filter(
          (item) => item.status === "filled" || item.status === "closed",
        );
      default:
        return items;
    }
  }, [ownedPostings, activePostings, activeFilter, appliedPostings, invitedPostings]);

  return {
    posts,
    isLoading,
    activeFilter,
    setActiveFilter,
  };
}
