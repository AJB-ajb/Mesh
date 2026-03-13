"use client";

import { useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import {
  subscribeToActivityCards,
  unsubscribeChannel,
} from "@/lib/supabase/realtime";
import type {
  ActivityCardWithDetails,
  ActivityCardStatus,
} from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActivityFeedData = {
  cards: ActivityCardWithDetails[];
  userId: string | null;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchActivityFeed(): Promise<ActivityFeedData> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { cards: [], userId: null };
  }

  const { data, error } = await supabase
    .from("activity_cards")
    .select(
      `
      *,
      from_profile:from_user_id(full_name, user_id),
      space_posting:posting_id(text, category, tags, status)
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return {
    cards: (data ?? []) as ActivityCardWithDetails[],
    userId: user.id,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivityFeed() {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.activityCards(),
    fetchActivityFeed,
    { keepPreviousData: true },
  );

  const userId = data?.userId ?? null;

  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  // Subscribe to new activity cards in real time
  useEffect(() => {
    if (!userId) return;

    const channel = subscribeToActivityCards(userId, () => {
      mutateRef.current();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [userId]);

  // Derive pending count from data
  const pendingCount =
    data?.cards.filter((c: ActivityCardWithDetails) => c.status === "pending")
      .length ?? 0;

  // Act on a card (change status)
  const actOnCard = useCallback(
    async (cardId: string, status: ActivityCardStatus) => {
      const supabase = createClient();

      const update: Record<string, unknown> = { status };
      if (status === "acted") {
        update.acted_at = new Date().toISOString();
      }

      // Optimistic update: update the card in cache immediately
      mutate(
        (current: ActivityFeedData | undefined) => {
          if (!current) return current;
          return {
            ...current,
            cards: current.cards.map((card: ActivityCardWithDetails) =>
              card.id === cardId ? { ...card, status } : card,
            ),
          };
        },
        { revalidate: false },
      );

      const { error: updateError } = await supabase
        .from("activity_cards")
        .update(update)
        .eq("id", cardId);

      if (updateError) {
        console.error("[ActivityFeed] Error updating card:", updateError);
        // Revalidate to restore correct state
        mutate();
        return false;
      }

      // Revalidate for consistency
      mutate();
      return true;
    },
    [mutate],
  );

  return {
    cards: data?.cards ?? [],
    pendingCount,
    userId,
    error,
    isLoading,
    mutate,
    actOnCard,
  };
}
