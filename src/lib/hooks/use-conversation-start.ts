"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useConversationStart(
  postingId: string,
  currentUserId: string | null,
  creatorId: string | null,
  setError: (error: string | null) => void,
) {
  const router = useRouter();

  const handleStartConversation = async (otherUserId: string) => {
    if (!currentUserId) return;

    const supabase = createClient();

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("posting_id", postingId)
      .or(
        `and(participant_1.eq.${currentUserId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${currentUserId})`,
      )
      .single();

    if (existingConv) {
      router.push(`/connections?conversation=${existingConv.id}`);
      return;
    }

    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        posting_id: postingId,
        participant_1: currentUserId,
        participant_2: otherUserId,
      })
      .select()
      .single();

    if (convError) {
      setError("Failed to start conversation. Please try again.");
      return;
    }

    router.push(`/connections?conversation=${newConv.id}`);
  };

  const handleContactCreator = () => {
    if (creatorId) {
      handleStartConversation(creatorId);
    }
  };

  return {
    handleStartConversation,
    handleContactCreator,
  };
}
