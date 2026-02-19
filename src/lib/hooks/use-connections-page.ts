import useSWR from "swr";
import { getUserOrThrow } from "@/lib/supabase/auth";

export type MergedConnection = {
  friendshipId: string;
  otherUser: {
    user_id: string;
    full_name: string | null;
    headline: string | null;
  };
  conversation: {
    id: string;
    posting_id: string | null;
    posting?: { title: string };
    participant_1: string;
    participant_2: string;
  } | null;
  lastMessage: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unreadCount: number;
};

type PendingConnection = {
  friendshipId: string;
  otherUser: {
    user_id: string;
    full_name: string | null;
    headline: string | null;
  };
};

type ConnectionsPageData = {
  mergedConnections: MergedConnection[];
  pendingIncoming: PendingConnection[];
  currentUserId: string;
};

async function fetchConnectionsPageData(): Promise<ConnectionsPageData> {
  const { supabase, user } = await getUserOrThrow();

  // Fetch friendships and conversations in parallel
  const [{ data: friendshipsData }, { data: conversationsData }] =
    await Promise.all([
      supabase
        .from("friendships")
        .select(
          "*, friend:profiles!friendships_friend_id_fkey(user_id, full_name, headline), user:profiles!friendships_user_id_fkey(user_id, full_name, headline)",
        )
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
      supabase
        .from("conversations")
        .select("*")
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order("updated_at", { ascending: false }),
    ]);

  const friendships = friendshipsData || [];
  const conversations = conversationsData || [];

  // Separate accepted and pending incoming
  const accepted = friendships.filter((f) => f.status === "accepted");
  const pendingIncomingRaw = friendships.filter(
    (f) => f.status === "pending" && f.friend_id === user.id,
  );

  // Build a map: otherUserId -> conversation
  const convByUserId = new Map<string, (typeof conversations)[number]>();
  for (const conv of conversations) {
    const otherUserId =
      conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
    // Keep the most-recent conversation per user (already sorted by updated_at desc)
    if (!convByUserId.has(otherUserId)) {
      convByUserId.set(otherUserId, conv);
    }
  }

  // Enrich each accepted connection with conversation data
  const mergedConnections = await Promise.all(
    accepted.map(async (f) => {
      const otherUser =
        f.user_id === user.id
          ? (f.friend as {
              user_id: string;
              full_name: string | null;
              headline: string | null;
            } | null)
          : (f.user as {
              user_id: string;
              full_name: string | null;
              headline: string | null;
            } | null);

      const otherUserId = f.user_id === user.id ? f.friend_id : f.user_id;
      const conv = convByUserId.get(otherUserId) ?? null;

      let lastMessage: MergedConnection["lastMessage"] = null;
      let unreadCount = 0;
      let posting: { title: string } | undefined;

      if (conv) {
        const [lastMsgResult, unreadResult, postingResult] = await Promise.all([
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
          conv.posting_id
            ? supabase
                .from("postings")
                .select("title")
                .eq("id", conv.posting_id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        lastMessage = lastMsgResult.data ?? null;
        unreadCount = unreadResult.count ?? 0;
        posting = postingResult.data ?? undefined;
      }

      return {
        friendshipId: f.id,
        otherUser: {
          user_id: otherUser?.user_id ?? otherUserId,
          full_name: otherUser?.full_name ?? null,
          headline: otherUser?.headline ?? null,
        },
        conversation: conv
          ? {
              id: conv.id,
              posting_id: conv.posting_id ?? null,
              posting,
              participant_1: conv.participant_1,
              participant_2: conv.participant_2,
            }
          : null,
        lastMessage,
        unreadCount,
      } satisfies MergedConnection;
    }),
  );

  // Sort: connections with messages by last_message.created_at desc, rest alphabetically
  mergedConnections.sort((a, b) => {
    if (a.lastMessage && b.lastMessage) {
      return (
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
      );
    }
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    // Both have no messages — sort alphabetically
    return (a.otherUser.full_name ?? "").localeCompare(
      b.otherUser.full_name ?? "",
    );
  });

  // Build pending incoming
  const pendingIncoming: PendingConnection[] = pendingIncomingRaw.map((f) => {
    const otherUser = f.user as {
      user_id: string;
      full_name: string | null;
      headline: string | null;
    } | null;
    return {
      friendshipId: f.id,
      otherUser: {
        user_id: otherUser?.user_id ?? f.user_id,
        full_name: otherUser?.full_name ?? null,
        headline: otherUser?.headline ?? null,
      },
    };
  });

  return {
    mergedConnections,
    pendingIncoming,
    currentUserId: user.id,
  };
}

export function useConnectionsPage() {
  const { data, error, isLoading, mutate } = useSWR(
    "connections-page",
    fetchConnectionsPageData,
  );

  return {
    mergedConnections: data?.mergedConnections ?? [],
    pendingIncoming: data?.pendingIncoming ?? [],
    currentUserId: data?.currentUserId ?? null,
    error,
    isLoading,
    mutate,
  };
}
