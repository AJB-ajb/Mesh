"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  shouldNotify,
  type NotificationPreferences,
} from "@/lib/notifications/preferences";
import type { GroupMessageWithSender } from "./use-group-messages";

type TeamMember = {
  user_id: string;
  full_name: string | null;
};

type UseSendGroupMessageOptions = {
  postingId: string;
  postingTitle: string;
  currentUserId: string;
  senderName: string | null;
  teamMembers: TeamMember[];
  onOptimisticMessage?: (message: GroupMessageWithSender) => void;
};

export function useSendGroupMessage({
  postingId,
  postingTitle,
  currentUserId,
  senderName,
  teamMembers,
  onOptimisticMessage,
}: UseSendGroupMessageOptions) {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !currentUserId) return false;

      setIsSending(true);

      const supabase = createClient();

      // Optimistic update
      const optimisticMessage: GroupMessageWithSender = {
        id: `optimistic-${Date.now()}`,
        posting_id: postingId,
        sender_id: currentUserId,
        content: trimmed,
        created_at: new Date().toISOString(),
        sender_name: senderName,
      };
      onOptimisticMessage?.(optimisticMessage);

      try {
        const { data: newMessage, error } = await supabase
          .from("group_messages")
          .insert({
            posting_id: postingId,
            sender_id: currentUserId,
            content: trimmed,
          })
          .select("id, posting_id, sender_id, content, created_at")
          .single();

        if (error) {
          console.error("[SendGroupMessage] Error inserting message:", error);
          setIsSending(false);
          return false;
        }

        // Auto-mark own message as read (fire-and-forget)
        supabase
          .from("group_message_reads")
          .upsert(
            { message_id: newMessage.id, user_id: currentUserId },
            { onConflict: "message_id,user_id" },
          )
          .then(({ error: readError }) => {
            if (readError) {
              console.warn(
                "[SendGroupMessage] Error marking own message as read:",
                readError,
              );
            }
          });

        // Notify other team members (fire-and-forget)
        const otherMembers = teamMembers.filter(
          (m) => m.user_id !== currentUserId,
        );

        if (otherMembers.length > 0) {
          const memberIds = otherMembers.map((m) => m.user_id);

          // Fetch their notification preferences
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, notification_preferences")
            .in("user_id", memberIds);

          const prefsById = new Map<string, NotificationPreferences | null>();
          for (const p of profiles ?? []) {
            prefsById.set(
              p.user_id,
              p.notification_preferences as NotificationPreferences | null,
            );
          }

          const notifications = otherMembers
            .filter((m) => {
              const prefs = prefsById.get(m.user_id);
              return shouldNotify(prefs, "new_group_message", "in_app");
            })
            .map((m) => ({
              user_id: m.user_id,
              type: "new_group_message",
              title: "New Team Message",
              body: `${senderName ?? "Someone"} in "${postingTitle}": ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}`,
              related_posting_id: postingId,
            }));

          if (notifications.length > 0) {
            supabase
              .from("notifications")
              .insert(notifications)
              .then(({ error: notifError }) => {
                if (notifError) {
                  console.warn(
                    "[SendGroupMessage] Error creating notifications:",
                    notifError,
                  );
                }
              });
          }
        }

        setIsSending(false);
        return true;
      } catch (err) {
        console.error("[SendGroupMessage] Unexpected error:", err);
        setIsSending(false);
        return false;
      }
    },
    [
      postingId,
      postingTitle,
      currentUserId,
      senderName,
      teamMembers,
      onOptimisticMessage,
    ],
  );

  return { sendMessage, isSending };
}
