import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Fetch notifications and conversations in parallel
  const [{ data: notificationsData }, { data: conversationsData }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("updated_at", { ascending: false }),
    ]);

  // Enrich conversations with other user info and last message
  const enrichedConversations = await Promise.all(
    (conversationsData || []).map(async (conv) => {
      const otherUserId =
        conv.participant_1 === user.id
          ? conv.participant_2
          : conv.participant_1;

      const [
        { data: profile },
        postingResult,
        { data: lastMessageData },
        { count },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, headline, user_id")
          .eq("user_id", otherUserId)
          .maybeSingle(),
        conv.posting_id
          ? supabase
              .from("postings")
              .select("title")
              .eq("id", conv.posting_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("read", false)
          .neq("sender_id", user.id),
      ]);

      return {
        ...conv,
        other_user: profile || undefined,
        posting: postingResult.data || undefined,
        last_message: lastMessageData || undefined,
        unread_count: count || 0,
      };
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
