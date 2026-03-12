"use client";

import { useState, useCallback } from "react";
import { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import type {
  SpaceMessageType,
  SpacePostingInsert,
} from "@/lib/supabase/types";
import type { SpaceMessageWithSender } from "./use-space-messages";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SendMessageOptions = {
  spaceId: string;
  senderId: string;
  senderName: string | null;
};

type SendRegularMessage = {
  mode: "message";
  content: string;
};

type SendPostingMessage = {
  mode: "posting";
  text: string;
  category?: string | null;
  tags?: string[];
  capacity?: number;
  teamSizeMin?: number;
  deadline?: string | null;
  activityDate?: string | null;
  visibility?: "public" | "private";
  autoAccept?: boolean;
};

export type SendPayload = SendRegularMessage | SendPostingMessage;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSendSpaceMessage({
  spaceId,
  senderId,
  senderName,
}: SendMessageOptions) {
  const [isSending, setIsSending] = useState(false);
  const { mutate } = useSWRConfig();

  const send = useCallback(
    async (payload: SendPayload): Promise<boolean> => {
      if (!spaceId || !senderId) return false;

      setIsSending(true);
      const supabase = createClient();

      try {
        if (payload.mode === "message") {
          const trimmed = payload.content.trim();
          if (!trimmed) {
            setIsSending(false);
            return false;
          }

          // Optimistic update: add message to SWR cache immediately
          const optimisticMsg: SpaceMessageWithSender = {
            id: `optimistic-${Date.now()}`,
            space_id: spaceId,
            sender_id: senderId,
            type: "message",
            content: trimmed,
            posting_id: null,
            card_id: null,
            created_at: new Date().toISOString(),
            profiles: senderName
              ? { full_name: senderName, user_id: senderId }
              : null,
          };

          const messagesKey = cacheKeys.spaceMessages(spaceId);
          mutate(
            messagesKey,
            (current: { messages: SpaceMessageWithSender[]; hasMore: boolean } | undefined) => {
              if (!current) return current;
              return {
                ...current,
                messages: [...current.messages, optimisticMsg],
              };
            },
            { revalidate: false },
          );

          // Send to server
          const { error } = await supabase
            .from("space_messages")
            .insert({
              space_id: spaceId,
              sender_id: senderId,
              type: "message" as SpaceMessageType,
              content: trimmed,
            });

          if (error) {
            console.error("[SendSpaceMessage] Error:", error);
            // Revalidate to remove optimistic message
            mutate(messagesKey);
            setIsSending(false);
            return false;
          }

          // Revalidate to get the real message with server-assigned ID
          mutate(messagesKey);
        } else {
          // Posting mode: create a space posting, then insert a message referencing it
          const postingData: SpacePostingInsert = {
            space_id: spaceId,
            created_by: senderId,
            text: payload.text,
            category: payload.category ?? null,
            tags: payload.tags ?? [],
            capacity: payload.capacity ?? 4,
            team_size_min: payload.teamSizeMin ?? 1,
            deadline: payload.deadline ?? null,
            activity_date: payload.activityDate ?? null,
            visibility: payload.visibility ?? "public",
            auto_accept: payload.autoAccept ?? false,
          };

          const { data: posting, error: postingError } = await supabase
            .from("space_postings")
            .insert(postingData)
            .select("id")
            .single();

          if (postingError) {
            console.error("[SendSpaceMessage] Posting error:", postingError);
            setIsSending(false);
            return false;
          }

          // Insert a message of type "posting" referencing the new posting
          const { error: msgError } = await supabase
            .from("space_messages")
            .insert({
              space_id: spaceId,
              sender_id: senderId,
              type: "posting" as SpaceMessageType,
              posting_id: posting.id,
              content: payload.text,
            });

          if (msgError) {
            console.error("[SendSpaceMessage] Message error:", msgError);
            setIsSending(false);
            return false;
          }

          // Revalidate both messages and postings caches
          mutate(cacheKeys.spaceMessages(spaceId));
          mutate(cacheKeys.spacePostings(spaceId));
        }

        setIsSending(false);
        return true;
      } catch (err) {
        console.error("[SendSpaceMessage] Unexpected error:", err);
        setIsSending(false);
        return false;
      }
    },
    [spaceId, senderId, senderName, mutate],
  );

  return { send, isSending };
}
