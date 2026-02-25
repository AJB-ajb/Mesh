import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { getUserOrThrow } from "@/lib/supabase/auth";
import type {
  Notification as RealtimeNotification,
  Conversation as RealtimeConversation,
} from "@/lib/supabase/realtime";

type Notification = RealtimeNotification;

type Conversation = RealtimeConversation & {
  posting_id: string | null;
  other_user?: {
    full_name: string | null;
    headline: string | null;
    user_id: string;
  };
  posting?: {
    title: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type InboxData = {
  notifications: Notification[];
  conversations: Conversation[];
  currentUserId: string;
};

async function fetchInboxData(): Promise<InboxData> {
  const { supabase, user } = await getUserOrThrow();

  // Fetch notifications and enriched conversations in parallel
  const [{ data: notificationsData }, { data: conversationsData }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_inbox_conversations", { p_user_id: user.id }),
    ]);

  // Map RPC rows to the Conversation shape expected by the UI
  const enrichedConversations: Conversation[] = (conversationsData || []).map(
    (row: {
      id: string;
      participant_1: string;
      participant_2: string;
      posting_id: string | null;
      created_at: string;
      updated_at: string;
      other_user_id: string;
      other_user_full_name: string | null;
      other_user_headline: string | null;
      posting_title: string | null;
      last_message_content: string | null;
      last_message_created_at: string | null;
      last_message_sender_id: string | null;
      unread_count: number;
    }) => ({
      id: row.id,
      participant_1: row.participant_1,
      participant_2: row.participant_2,
      posting_id: row.posting_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      other_user: row.other_user_id
        ? {
            full_name: row.other_user_full_name,
            headline: row.other_user_headline,
            user_id: row.other_user_id,
          }
        : undefined,
      posting: row.posting_title ? { title: row.posting_title } : undefined,
      last_message: row.last_message_content
        ? {
            content: row.last_message_content,
            created_at: row.last_message_created_at!,
            sender_id: row.last_message_sender_id!,
          }
        : undefined,
      unread_count: row.unread_count ?? 0,
    }),
  );

  return {
    notifications: notificationsData || [],
    conversations: enrichedConversations,
    currentUserId: user.id,
  };
}

export function useInboxData() {
  const { data, error, isLoading, mutate } = useSWR("inbox", fetchInboxData);

  return {
    notifications: data?.notifications ?? [],
    conversations: data?.conversations ?? [],
    currentUserId: data?.currentUserId ?? null,
    error,
    isLoading,
    mutate,
  };
}

async function fetchConversationMessages(key: string): Promise<Message[]> {
  const [, conversationId, userId] = key.split("/");
  const supabase = createClient();

  const { data: messagesData, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
    throw messagesError;
  }

  // Mark messages as read (fire and forget)
  supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .then(({ error: updateError }) => {
      if (updateError) {
        console.error("Error marking messages as read:", updateError);
      }
    });

  return messagesData || [];
}

export function useConversationMessages(
  conversationId: string | null,
  currentUserId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR(
    conversationId && currentUserId
      ? `messages/${conversationId}/${currentUserId}`
      : null,
    fetchConversationMessages,
  );

  return {
    messages: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

export type { Notification, Conversation, Message };
