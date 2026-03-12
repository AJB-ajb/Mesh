"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import {
  subscribeToSpaceMemberChanges,
  unsubscribeChannel,
} from "@/lib/supabase/realtime";
import type {
  SpaceListItem,
} from "@/lib/supabase/types";
import { GLOBAL_SPACE_ID, deriveSpaceType } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SpaceListData = {
  spaces: SpaceListItem[];
  userId: string | null;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchSpaces(): Promise<SpaceListData> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { spaces: [], userId: null };
  }

  // Fetch spaces the user is a member of, with membership info
  const { data, error } = await supabase
    .from("spaces")
    .select(
      `
      *,
      space_members!inner(user_id, unread_count, pinned, muted, role)
    `,
    )
    .eq("space_members.user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const spaces = (data ?? []) as Omit<SpaceListItem, "type">[];

  // Fetch latest message + member count for each space in parallel
  const enrichPromises = spaces.map(async (space) => {
    const [msgResult, countResult] = await Promise.all([
      supabase
        .from("space_messages")
        .select("content, type, created_at, sender_id")
        .eq("space_id", space.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("space_members")
        .select("*", { count: "exact", head: true })
        .eq("space_id", space.id),
    ]);

    return {
      spaceId: space.id,
      message: msgResult.data,
      memberCount: countResult.count ?? 0,
    };
  });

  const enrichments = await Promise.all(enrichPromises);
  const enrichMap = new Map(enrichments.map((e) => [e.spaceId, e]));

  // Enrich spaces with last message, member count, and derived type
  const enriched = spaces.map((space) => {
    const e = enrichMap.get(space.id);
    return {
      ...space,
      last_message: e?.message ?? null,
      member_count: e?.memberCount ?? 0,
      type: deriveSpaceType(space, e?.memberCount ?? 0),
    } as SpaceListItem;
  });

  // Sort: Global Space first, then pinned, then by last activity
  enriched.sort((a, b) => {
    // Global space always first
    if (a.id === GLOBAL_SPACE_ID) return -1;
    if (b.id === GLOBAL_SPACE_ID) return 1;

    // Pinned spaces next
    const aPinned = a.space_members?.[0]?.pinned ?? false;
    const bPinned = b.space_members?.[0]?.pinned ?? false;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Then by last activity (last message or updated_at)
    const aTime =
      a.last_message?.created_at ?? a.updated_at;
    const bTime =
      b.last_message?.created_at ?? b.updated_at;
    return bTime.localeCompare(aTime);
  });

  return { spaces: enriched, userId: user.id };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpaceList() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.spaces(),
    fetchSpaces,
    { keepPreviousData: true },
  );

  const userId = data?.userId ?? null;

  // Subscribe to space_members changes for badge/unread updates
  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToSpaceMemberChanges(userId, () => {
      mutate();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [userId, mutate]);

  return {
    spaces: data?.spaces ?? [],
    userId,
    error,
    isLoading,
    mutate,
  };
}
