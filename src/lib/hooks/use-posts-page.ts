"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { usePostings } from "./use-postings";
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
// Shared posting row type (used by multiple fetchers)
// ---------------------------------------------------------------------------

type PostingRow = {
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

const POSTING_COLUMNS =
  "id, title, description, status, category, team_size_min, team_size_max, created_at, creator_id" as const;

// ---------------------------------------------------------------------------
// Joined-postings fetcher (accepted applications — all, not just "active")
// ---------------------------------------------------------------------------

async function fetchJoinedPostings(): Promise<PostingRow[]> {
  const { supabase, user } = await getUserOrThrow();

  const { data: applications } = await supabase
    .from("applications")
    .select("posting_id")
    .eq("applicant_id", user.id)
    .eq("status", "accepted")
    .limit(200);

  const postingIds = (applications ?? []).map((a) => a.posting_id);
  if (postingIds.length === 0) return [];

  const { data: postings } = await supabase
    .from("postings")
    .select(POSTING_COLUMNS)
    .in("id", postingIds);

  return (postings ?? []) as PostingRow[];
}

// ---------------------------------------------------------------------------
// Applied-postings fetcher (pending/waitlisted join requests)
// ---------------------------------------------------------------------------

async function fetchAppliedPostings(): Promise<PostingRow[]> {
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
    .select(POSTING_COLUMNS)
    .in("id", postingIds);

  return (postings ?? []) as PostingRow[];
}

// ---------------------------------------------------------------------------
// Invited-postings fetcher (pending invites from friend_asks)
// ---------------------------------------------------------------------------

async function fetchInvitedPostings(): Promise<PostingRow[]> {
  const { supabase, user } = await getUserOrThrow();

  // Find friend_asks where user is in pending_invitees (sequential) or
  // ordered_friend_list minus declined_list (parallel)
  const { data: friendAsks } = await supabase
    .from("friend_asks")
    .select(
      "posting_id, ordered_friend_list, pending_invitees, declined_list, invite_mode",
    )
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
    .select(POSTING_COLUMNS)
    .in("id", invitedPostingIds);

  return (postings ?? []) as PostingRow[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePostsPage() {
  const [activeFilter, setActiveFilter] = useState<PostsPageFilter>("all");

  const { postings: ownedPostings, isLoading: isLoadingOwned } =
    usePostings("my-postings");

  // Fetch joined postings (all accepted applications, regardless of team size)
  const { data: joinedPostings, isLoading: isLoadingJoined } = useSWR(
    activeFilter === "joined" || activeFilter === "all"
      ? "posts-page-joined"
      : null,
    fetchJoinedPostings,
  );

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
    ((activeFilter === "joined" || activeFilter === "all") &&
      isLoadingJoined) ||
    ((activeFilter === "applied" || activeFilter === "all") &&
      isLoadingApplied) ||
    ((activeFilter === "invited" || activeFilter === "all") &&
      isLoadingInvited);

  const posts = useMemo(() => {
    const items: PostsCardData[] = [];
    const seenIds = new Set<string>();

    // Helper to push a posting row with a given role
    const pushPosting = (
      p: PostingRow,
      role: PostsCardData["role"],
      href: string,
    ) => {
      if (seenIds.has(p.id)) return;
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
        role,
        href,
      });
    };

    // Owned postings (user created these) — added first so they take priority
    for (const p of ownedPostings) {
      pushPosting(p, "owner", `/postings/${p.id}`);
    }

    // Joined postings (accepted member, not creator)
    for (const p of joinedPostings ?? []) {
      pushPosting(p, "joined", `/postings/${p.id}?tab=project`);
    }

    // Applied postings (pending/waitlisted join requests)
    for (const p of appliedPostings ?? []) {
      pushPosting(p, "applied", `/postings/${p.id}`);
    }

    // Invited postings (pending invites from friend_asks)
    for (const p of invitedPostings ?? []) {
      pushPosting(p, "invited", `/postings/${p.id}`);
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
  }, [
    ownedPostings,
    joinedPostings,
    activeFilter,
    appliedPostings,
    invitedPostings,
  ]);

  return {
    posts,
    isLoading,
    activeFilter,
    setActiveFilter,
  };
}
