"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import type { SpaceJoinRequest, JoinRequestStatus } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type JoinRequestData = {
  request: SpaceJoinRequest | null;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchUserJoinRequest(key: string): Promise<JoinRequestData> {
  // Key format: space-join-requests/{postingId}
  const postingId = key.split("/")[1];
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { request: null };
  }

  const { data, error } = await supabase
    .from("space_join_requests")
    .select("*")
    .eq("posting_id", postingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  return { request: data as SpaceJoinRequest | null };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpaceJoinRequest(postingId: string | null) {
  const key = postingId ? cacheKeys.spaceJoinRequests(postingId) : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchUserJoinRequest);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit a join request
  const submit = useCallback(async (): Promise<boolean> => {
    if (!postingId) return false;

    setIsSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSubmitting(false);
      return false;
    }

    try {
      const { data: newRequest, error: insertError } = await supabase
        .from("space_join_requests")
        .insert({
          posting_id: postingId,
          user_id: user.id,
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("[SpaceJoinRequest] Error submitting:", insertError);
        setIsSubmitting(false);
        return false;
      }

      // Update the SWR cache with the new request
      mutate(
        { request: newRequest as SpaceJoinRequest },
        { revalidate: false },
      );

      setIsSubmitting(false);
      return true;
    } catch (err) {
      console.error("[SpaceJoinRequest] Unexpected error:", err);
      setIsSubmitting(false);
      return false;
    }
  }, [postingId, mutate]);

  // Withdraw a join request
  const withdraw = useCallback(async (): Promise<boolean> => {
    if (!data?.request?.id) return false;

    const supabase = createClient();

    try {
      const { error: updateError } = await supabase
        .from("space_join_requests")
        .update({ status: "withdrawn" as JoinRequestStatus })
        .eq("id", data.request.id);

      if (updateError) {
        console.error("[SpaceJoinRequest] Error withdrawing:", updateError);
        return false;
      }

      // Revalidate
      mutate();
      return true;
    } catch (err) {
      console.error("[SpaceJoinRequest] Unexpected error:", err);
      return false;
    }
  }, [data, mutate]);

  return {
    request: data?.request ?? null,
    status: data?.request?.status ?? null,
    error,
    isLoading,
    isSubmitting,
    submit,
    withdraw,
    mutate,
  };
}
