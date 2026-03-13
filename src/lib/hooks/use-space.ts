"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import type { Space, SpaceMember, Profile } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpaceMemberWithProfile = SpaceMember & {
  profiles: Pick<Profile, "full_name" | "headline" | "user_id"> | null;
};

export type SpaceDetail = Space & {
  members: SpaceMemberWithProfile[];
  currentMember: SpaceMember | null;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchSpace(url: string): Promise<SpaceDetail> {
  const spaceId = url.split("/").pop()!;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch space and members in parallel
  const [spaceResult, membersResult] = await Promise.all([
    supabase.from("spaces").select("*").eq("id", spaceId).single(),
    supabase
      .from("space_members")
      .select("*, profiles:user_id(full_name, headline, user_id)")
      .eq("space_id", spaceId)
      .order("joined_at", { ascending: true }),
  ]);

  if (spaceResult.error) throw spaceResult.error;
  if (membersResult.error) throw membersResult.error;

  const space = spaceResult.data;
  const members = (membersResult.data ?? []) as SpaceMemberWithProfile[];

  // Find the current user's membership
  const currentMember = user
    ? members.find((m) => m.user_id === user.id) ?? null
    : null;

  return {
    ...space,
    members,
    currentMember,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpace(spaceId: string | null) {
  const key = spaceId ? cacheKeys.space(spaceId) : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchSpace, {
    keepPreviousData: true,
  });

  return {
    space: data ?? null,
    members: data?.members ?? [],
    currentMember: data?.currentMember ?? null,
    error,
    isLoading,
    mutate,
  };
}
