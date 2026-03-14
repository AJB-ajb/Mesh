"use client";

import { useEffect, useCallback } from "react";
import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";
import {
  subscribeToSpaceCards,
  unsubscribeChannel,
} from "@/lib/supabase/realtime";
import type { SpaceCard } from "@/lib/supabase/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch cards");
  const json = await res.json();
  return json.data.cards as SpaceCard[];
};

export function useSpaceCards(spaceId: string | null) {
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
    async (cardId: string, optionIndex: number) => {
      if (!spaceId) return;
      const res = await fetch(`/api/spaces/${spaceId}/cards/${cardId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_index: optionIndex }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Vote error:", await res.text());
      }
      mutate();
    },
    [spaceId, mutate],
  );

  const resolve = useCallback(
    async (cardId: string, resolvedData?: Record<string, unknown>) => {
      if (!spaceId) return;
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
      }
      mutate();
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
    async (type: SpaceCard["type"], data: SpaceCard["data"]) => {
      if (!spaceId) return null;
      const res = await fetch(`/api/spaces/${spaceId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) {
        console.error("[useSpaceCards] Create error:", await res.text());
        return null;
      }
      const json = await res.json();
      mutate();
      return json.data.card as SpaceCard;
    },
    [spaceId, mutate],
  );

  return { cards, isLoading, vote, resolve, cancel, createCard, mutate };
}
