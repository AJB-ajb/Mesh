import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

/**
 * POST /api/applications
 * Create a join request (application) for a posting.
 * Determines status based on posting state:
 *   - auto_accept + open → "accepted"
 *   - manual review + open → "pending"
 *   - filled → "waitlisted"
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const { posting_id, cover_message } = body;

  if (!posting_id || typeof posting_id !== "string") {
    return apiError("VALIDATION", "posting_id is required", 400);
  }

  // Fetch the posting
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("id, creator_id, mode, status, auto_accept, team_size_max, title")
    .eq("id", posting_id)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  // Cannot apply to own posting
  if (posting.creator_id === user.id) {
    return apiError("VALIDATION", "Cannot apply to your own posting", 400);
  }

  // Check posting is open or filled (filled = waitlist)
  if (posting.status !== "open" && posting.status !== "filled") {
    return apiError(
      "VALIDATION",
      "This posting is no longer accepting requests",
      400,
    );
  }

  // Check for existing application to prevent duplicates
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("posting_id", posting_id)
    .eq("applicant_id", user.id)
    .maybeSingle();

  if (existing) {
    return apiError(
      "CONFLICT",
      "You have already applied to this posting",
      409,
    );
  }

  // Determine initial status
  const isFilled = posting.status === "filled";
  const isAutoAccept = posting.auto_accept === true;

  let initialStatus: string;
  if (isFilled) {
    initialStatus = "waitlisted";
  } else if (isAutoAccept) {
    initialStatus = "accepted";
  } else {
    initialStatus = "pending";
  }

  // Only include cover message for manual-review open postings
  const effectiveCoverMessage =
    !isFilled && !isAutoAccept && cover_message?.trim()
      ? cover_message.trim()
      : null;

  // Create the application
  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert({
      posting_id,
      applicant_id: user.id,
      cover_message: effectiveCoverMessage,
      status: initialStatus,
    })
    .select()
    .single();

  if (insertError) {
    return apiError("INTERNAL", "Failed to create application", 500);
  }

  // --- Notifications ---

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("user_id", posting.creator_id)
    .single();

  const { data: applicantProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  const applicantName = applicantProfile?.full_name || "Someone";
  const ownerPrefs =
    ownerProfile?.notification_preferences as NotificationPreferences | null;

  if (shouldNotify(ownerPrefs, "interest_received", "in_app")) {
    const notifTitle = isFilled
      ? "New Waitlist Entry"
      : isAutoAccept
        ? "New Member Joined"
        : "New Join Request";
    const notifBody = isFilled
      ? `${applicantName} has joined the waitlist for "${posting.title}"`
      : isAutoAccept
        ? `${applicantName} has joined your posting "${posting.title}"`
        : `${applicantName} has requested to join "${posting.title}"`;

    await supabase.from("notifications").insert({
      user_id: posting.creator_id,
      type: "application_received",
      title: notifTitle,
      body: notifBody,
      related_posting_id: posting_id,
      related_application_id: application.id,
      related_user_id: user.id,
    });
  }

  // Auto-accept: check if posting should be marked as filled
  if (isAutoAccept && !isFilled) {
    const { count } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("posting_id", posting_id)
      .eq("status", "accepted");

    if (count && count >= posting.team_size_max) {
      await supabase
        .from("postings")
        .update({ status: "filled" })
        .eq("id", posting_id);
    }
  }

  // Compute waitlist position if waitlisted
  let waitlistPosition: number | null = null;
  if (initialStatus === "waitlisted") {
    const { count } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("posting_id", posting_id)
      .eq("status", "waitlisted");
    waitlistPosition = count ?? 1;
  }

  return apiSuccess(
    { application, status: initialStatus, waitlistPosition },
    201,
  );
});
