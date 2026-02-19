"use client";

import useSWR from "swr";
import { getUserOrThrow } from "@/lib/supabase/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivePosting = {
  id: string;
  title: string;
  description: string;
  team_size_min: number;
  team_size_max: number;
  category: string;
  status: string;
  created_at: string;
  creator_id: string;
  profiles?: {
    full_name: string | null;
    user_id: string;
  };
  role: "created" | "joined";
  acceptedCount: number;
  unreadCount: number;
};

type ActivePostingsData = {
  postings: ActivePosting[];
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchActivePostings(): Promise<ActivePostingsData> {
  const { supabase, user } = await getUserOrThrow();

  // 1. Fetch postings I created
  const { data: created } = await supabase
    .from("postings")
    .select("*, profiles:creator_id(full_name, user_id)")
    .eq("creator_id", user.id);

  // 2. Fetch posting IDs where I have an accepted application
  const { data: joinedApps } = await supabase
    .from("applications")
    .select("posting_id")
    .eq("applicant_id", user.id)
    .eq("status", "accepted");

  const joinedPostingIds = (joinedApps ?? []).map((a) => a.posting_id);

  // 3. Fetch those postings (avoid empty IN query)
  let joined: typeof created = [];
  if (joinedPostingIds.length > 0) {
    const { data } = await supabase
      .from("postings")
      .select("*, profiles:creator_id(full_name, user_id)")
      .in("id", joinedPostingIds);
    joined = data ?? [];
  }

  // 4. Combine and deduplicate (prefer "created" role)
  const allPostings = new Map<
    string,
    { posting: NonNullable<typeof created>[number]; role: "created" | "joined" }
  >();

  for (const p of created ?? []) {
    allPostings.set(p.id, { posting: p, role: "created" });
  }
  for (const p of joined ?? []) {
    if (!allPostings.has(p.id)) {
      allPostings.set(p.id, { posting: p, role: "joined" });
    }
  }

  if (allPostings.size === 0) {
    return { postings: [] };
  }

  // 5. Fetch accepted application counts for all candidate postings
  const allPostingIds = [...allPostings.keys()];
  const { data: acceptedApps } = await supabase
    .from("applications")
    .select("posting_id")
    .in("posting_id", allPostingIds)
    .eq("status", "accepted");

  // Group by posting_id and count
  const countByPosting = new Map<string, number>();
  for (const app of acceptedApps ?? []) {
    countByPosting.set(
      app.posting_id,
      (countByPosting.get(app.posting_id) ?? 0) + 1,
    );
  }

  // 6. Filter where acceptedCount >= team_size_min
  const result: ActivePosting[] = [];
  const activePostingIds: string[] = [];
  for (const [id, { posting, role }] of allPostings) {
    const acceptedCount = countByPosting.get(id) ?? 0;
    if (acceptedCount >= posting.team_size_min) {
      activePostingIds.push(id);
      result.push({
        id: posting.id,
        title: posting.title,
        description: posting.description,
        team_size_min: posting.team_size_min,
        team_size_max: posting.team_size_max,
        category: posting.category,
        status: posting.status,
        created_at: posting.created_at,
        creator_id: posting.creator_id,
        profiles: posting.profiles as ActivePosting["profiles"],
        role,
        acceptedCount,
        unreadCount: 0, // filled in below
      });
    }
  }

  // 7. Fetch unread group message counts for active postings
  if (activePostingIds.length > 0) {
    const { data: unreadRows } = await supabase.rpc(
      "unread_group_message_counts",
      {
        p_posting_ids: activePostingIds,
        p_user_id: user.id,
      },
    );

    const unreadByPosting = new Map<string, number>();
    for (const row of unreadRows ?? []) {
      unreadByPosting.set(row.posting_id, Number(row.unread_count));
    }

    for (const posting of result) {
      posting.unreadCount = unreadByPosting.get(posting.id) ?? 0;
    }
  }

  // Sort by most recent
  result.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return { postings: result };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivePostings() {
  const { data, error, isLoading } = useSWR(
    "active-postings",
    fetchActivePostings,
  );

  return {
    postings: data?.postings ?? [],
    isLoading,
    error,
  };
}
