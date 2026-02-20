/**
 * Promote the first waitlisted user when a spot opens on a posting.
 *
 * Shared by the withdraw and decide API routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

interface PostingInfo {
  title: string;
  creator_id: string;
  status: string;
  auto_accept: boolean;
  team_size_max: number;
}

export async function promoteFromWaitlist(
  supabase: SupabaseClient,
  postingId: string,
  posting: PostingInfo,
): Promise<void> {
  const { data: waitlisted } = await supabase
    .from("applications")
    .select("id, applicant_id")
    .eq("posting_id", postingId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!waitlisted) {
    // No waitlisted users — reopen if posting was filled
    if (posting.status === "filled") {
      await supabase
        .from("postings")
        .update({ status: "open" })
        .eq("id", postingId);
    }
    return;
  }

  if (posting.auto_accept) {
    // Auto-accept: promote the user directly
    await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", waitlisted.id);

    const { data: promotedProfile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", waitlisted.applicant_id)
      .single();

    const promotedPrefs =
      promotedProfile?.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(promotedPrefs, "application_accepted", "in_app")) {
      await supabase.from("notifications").insert({
        user_id: waitlisted.applicant_id,
        type: "application_accepted",
        title: "You're in!",
        body: `A spot opened on "${posting.title}" and you've been promoted from the waitlist!`,
        related_posting_id: postingId,
        related_application_id: waitlisted.id,
      });
    }
  } else {
    // Manual: notify owner that a waitlisted user is ready
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", posting.creator_id)
      .single();

    const ownerPrefs =
      ownerProfile?.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(ownerPrefs, "interest_received", "in_app")) {
      await supabase.from("notifications").insert({
        user_id: posting.creator_id,
        type: "application_received",
        title: "Spot opened — waitlist ready",
        body: `A spot opened on "${posting.title}". You have waitlisted people ready to accept.`,
        related_posting_id: postingId,
      });
    }

    if (posting.status === "filled") {
      await supabase
        .from("postings")
        .update({ status: "open" })
        .eq("id", postingId);
    }
  }
}
