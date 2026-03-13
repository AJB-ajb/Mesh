"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import {
  subscribeToSpaceMessages,
  unsubscribeChannel,
} from "@/lib/supabase/realtime";
import type { SpaceMessage, Profile } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SpaceMessageWithSender = SpaceMessage & {
  profiles: Pick<Profile, "full_name" | "user_id"> | null;
};

type MessagesData = {
  messages: SpaceMessageWithSender[];
  hasMore: boolean;
};

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchMessages(key: string): Promise<MessagesData> {
  const spaceId = key.split("/")[3]; // /api/spaces/{id}/messages
  const supabase = createClient();

  const { data, error } = await supabase
    .from("space_messages")
    .select("*, profiles:sender_id(full_name, user_id)")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (error) throw error;

  // Return in chronological order (oldest first) for display
  const messages = (data ?? []).reverse() as SpaceMessageWithSender[];

  return {
    messages,
    hasMore: (data ?? []).length === PAGE_SIZE,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpaceMessages(spaceId: string | null) {
  const key = spaceId ? cacheKeys.spaceMessages(spaceId) : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchMessages, {
    keepPreviousData: true,
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  // Subscribe to new space messages in real time
  useEffect(() => {
    if (!spaceId) return;

    const channel = subscribeToSpaceMessages(spaceId, (newMsg) => {
      // Append the new message to the cache
      mutateRef.current(
        (current: MessagesData | undefined) => {
          if (!current) return current;

          // Avoid duplicates (in case SWR revalidation already picked it up)
          if (
            current.messages.some(
              (m: SpaceMessageWithSender) => m.id === newMsg.id,
            )
          ) {
            return current;
          }

          // We don't have the sender profile from the realtime payload,
          // so add a minimal record. SWR revalidation will fill it in.
          const msgWithSender: SpaceMessageWithSender = {
            id: newMsg.id,
            space_id: newMsg.space_id,
            sender_id: newMsg.sender_id,
            type: newMsg.type as SpaceMessage["type"],
            content: newMsg.content,
            posting_id: newMsg.posting_id,
            card_id: null,
            created_at: newMsg.created_at,
            profiles: null,
          };

          return {
            ...current,
            messages: [...current.messages, msgWithSender],
          };
        },
        { revalidate: true },
      );
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [spaceId]);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load older messages (cursor-based pagination)
  const loadMore = useCallback(async () => {
    const currentData = dataRef.current;
    if (!spaceId || !currentData?.messages.length || !currentData.hasMore)
      return;

    setIsLoadingMore(true);
    const supabase = createClient();
    const oldestMessage = currentData.messages[0];

    try {
      const { data: olderData, error: olderError } = await supabase
        .from("space_messages")
        .select("*, profiles:sender_id(full_name, user_id)")
        .eq("space_id", spaceId)
        .lt("created_at", oldestMessage.created_at)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (olderError) throw olderError;

      const olderMessages = (
        olderData ?? []
      ).reverse() as SpaceMessageWithSender[];

      mutateRef.current(
        (current: MessagesData | undefined) => {
          if (!current) return current;
          return {
            messages: [...olderMessages, ...current.messages],
            hasMore: (olderData ?? []).length === PAGE_SIZE,
          };
        },
        { revalidate: false },
      );
    } finally {
      if (isMountedRef.current) setIsLoadingMore(false);
    }
  }, [spaceId]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!spaceId) return;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("space_members")
      .update({
        last_read_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq("space_id", spaceId)
      .eq("user_id", user.id);
  }, [spaceId]);

  return {
    messages: data?.messages ?? [],
    hasMore: data?.hasMore ?? false,
    error,
    isLoading,
    isLoadingMore,
    mutate,
    loadMore,
    markAsRead,
  };
}
