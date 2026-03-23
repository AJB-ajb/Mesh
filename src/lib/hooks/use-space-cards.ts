"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";
import {
  subscribeToSpaceCards,
  unsubscribeChannel,
} from "@/lib/supabase/realtime";
import type { SpaceCard, CardOption } from "@/lib/supabase/types";
import type { CardSuggestion } from "@/lib/ai/card-suggest";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch cards");
  const json = await res.json();
  return json.cards as SpaceCard[];
};

/** Apply a vote optimistically to a card's options (pure function). */
export function applyVoteToOptions(
  options: CardOption[],
  optionIndex: number,
  userId: string,
  multiSelect: boolean,
): CardOption[] {
  return options.map((opt, idx) => {
    const hasVote = opt.votes.includes(userId);

    if (idx === optionIndex) {
      // Toggle: remove if already voted, add if not
      return {
        ...opt,
        votes: hasVote
          ? opt.votes.filter((id) => id !== userId)
          : [...opt.votes, userId],
      };
    }

    // Single-select: remove user from all other options
    if (!multiSelect && hasVote) {
      return { ...opt, votes: opt.votes.filter((id) => id !== userId) };
    }

    return opt;
  });
}

export function useSpaceCards(spaceId: string | null, userId?: string | null) {
  const key = spaceId ? cacheKeys.spaceCards(spaceId) : null;
  const { data: cards = [], mutate, isLoading } = useSWR(key, fetcher);

  // Subscribe to realtime card updates
  useEffect(() => {
    if (!spaceId) return;

    const channel = subscribeToSpaceCards(spaceId, () => {
      // Revalidate on any card update (votes, resolution)
      mutate();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [spaceId, mutate]);

  const vote = useCallback(
    async (
      cardId: string,
      optionIndex: number,
    ): Promise<CardSuggestion | null> => {
      if (!spaceId) return null;

      // Optimistic update: apply vote locally before server round-trip
      if (userId) {
        mutate(
          (current) => {
            if (!current) return current;
            return current.map((card) => {
              if (card.id !== cardId) return card;
              const multiSelect = card.type === "time_proposal";
              const newOptions = applyVoteToOptions(
                (card.data as { options: CardOption[] }).options,
                optionIndex,
                userId,
                multiSelect,
              );
              return {
                ...card,
                data: { ...card.data, options: newOptions },
              };
            });
          },
          { revalidate: false },
        );
      }

      const res = await fetch(`/api/spaces/${spaceId}/cards/${cardId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_index: optionIndex }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Vote error:", await res.text());
        // Rollback: refetch server state
        mutate();
        return null;
      }
      const json = await res.json();
      // Revalidate to pick up server-side effects (auto-resolve, etc.)
      mutate();
      return (json.follow_up_suggestion as CardSuggestion) ?? null;
    },
    [spaceId, userId, mutate],
  );

  const resolve = useCallback(
    async (
      cardId: string,
      resolvedData?: Record<string, unknown>,
    ): Promise<CardSuggestion | null> => {
      if (!spaceId) return null;
      const res = await fetch(`/api/spaces/${spaceId}/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolved_data: resolvedData,
        }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Resolve error:", await res.text());
        mutate();
        return null;
      }
      const json = await res.json();
      mutate();
      return (json.follow_up_suggestion as CardSuggestion) ?? null;
    },
    [spaceId, mutate],
  );

  const cancel = useCallback(
    async (cardId: string) => {
      if (!spaceId) return;
      const res = await fetch(`/api/spaces/${spaceId}/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Cancel error:", await res.text());
      }
      mutate();
    },
    [spaceId, mutate],
  );

  const createCard = useCallback(
    async (
      type: SpaceCard["type"],
      data: SpaceCard["data"],
      deadline?: string,
    ) => {
      if (!spaceId) return null;
      const res = await fetch(`/api/spaces/${spaceId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data, deadline }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Create error:", await res.text());
        return null;
      }
      const json = await res.json();
      mutate();
      return json.card as SpaceCard;
    },
    [spaceId, mutate],
  );

  const optOut = useCallback(
    async (cardId: string, reason: "cant_make_any" | "pass") => {
      if (!spaceId) return;
      const res = await fetch(
        `/api/spaces/${spaceId}/cards/${cardId}/opt-out`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      if (!res.ok) {
        console.error("[useSpaceCards] Opt-out error:", await res.text());
      }
      mutate();
    },
    [spaceId, mutate],
  );

  const undoOptOut = useCallback(
    async (cardId: string) => {
      if (!spaceId) return;
      const res = await fetch(
        `/api/spaces/${spaceId}/cards/${cardId}/opt-out`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        console.error("[useSpaceCards] Undo opt-out error:", await res.text());
      }
      mutate();
    },
    [spaceId, mutate],
  );

  const commit = useCallback(
    async (
      cardId: string,
      commitment: "attending" | "maybe" | "cant_make_it",
    ) => {
      if (!spaceId) return;
      const res = await fetch(`/api/spaces/${spaceId}/cards/${cardId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitment }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Commit error:", await res.text());
      }
      mutate();
    },
    [spaceId, mutate],
  );

  return {
    cards,
    isLoading,
    vote,
    resolve,
    cancel,
    createCard,
    optOut,
    undoOptOut,
    commit,
    mutate,
  };
}
