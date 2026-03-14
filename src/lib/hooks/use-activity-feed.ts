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

  // Dispatch side-effect API call based on card type and action
  const dispatchSideEffect = useCallback(
    async (card: ActivityCardWithDetails, status: ActivityCardStatus) => {
      const cardData = (card.data ?? {}) as Record<string, unknown>;

      switch (card.type) {
        case "join_request": {
          // Only dispatch for admin cards (no "action" in data = admin card)
          if (cardData.action) return; // notification card, no side-effect
          const joinRequestId = cardData.join_request_id as string | undefined;
          if (!joinRequestId || !card.space_id || !card.posting_id) return;
          const jrStatus = status === "acted" ? "accepted" : "rejected";
          await fetch(
            `/api/spaces/${card.space_id}/postings/${card.posting_id}/join/${joinRequestId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: jrStatus }),
            },
          );
          break;
        }
        case "invite": {
          if (cardData.action) return; // notification card, no side-effect
          const inviteId = cardData.invite_id as string | undefined;
          if (!inviteId || !card.space_id || !card.posting_id) return;
          const inviteResponse = status === "acted" ? "accepted" : "declined";
          await fetch(
            `/api/spaces/${card.space_id}/postings/${card.posting_id}/invites/${inviteId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ response: inviteResponse }),
            },
          );
          break;
        }
        case "match": {
          // Navigate to the space/posting only on accept, not dismiss
          if (status === "acted" && card.space_id) {
            window.location.href = `/spaces/${card.space_id}`;
          }
          break;
        }
        case "connection_request": {
          const friendshipId = cardData.friendship_id as string | undefined;
          if (!friendshipId) return;
          const crStatus = status === "acted" ? "accepted" : "declined";
          await fetch(`/api/friendships/${friendshipId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: crStatus }),
          });
          break;
        }
      }
    },
    [],
  );

  // Act on a card (change status)
  const actOnCard = useCallback(
    async (cardId: string, status: ActivityCardStatus) => {
      const supabase = createClient();

      // Look up the full card for side-effect dispatch
      const card = data?.cards.find(
        (c: ActivityCardWithDetails) => c.id === cardId,
      );

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
            cards: current.cards.map((c: ActivityCardWithDetails) =>
              c.id === cardId ? { ...c, status } : c,
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

      // Dispatch side-effect for the card type
      if (card) {
        try {
          await dispatchSideEffect(card, status);
        } catch (err) {
          console.error("[ActivityFeed] Side-effect error:", err);
          // Revalidate to restore correct state on failure
          mutate();
        }
      }

      // Revalidate for consistency
      mutate();
      return true;
    },
    [mutate, data?.cards, dispatchSideEffect],
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
