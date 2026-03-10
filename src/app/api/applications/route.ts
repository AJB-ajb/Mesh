import { withAuth } from "@/lib/api/with-auth";
import { notifyIfPreferred } from "@/lib/api/notify-if-preferred";
import { markPostingFilledIfFull } from "@/lib/api/posting-fulfillment";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  getPosting,
  getProfile,
  getApplicationForPosting,
  createApplication,
  countApplicationsByStatus,
} from "@/lib/data";

/**
 * POST /api/applications
 * Create a join request (application) for a posting.
 * Determines status based on posting state:
 *   - auto_accept + open → "accepted"
 *   - manual review + open → "pending"
 *   - filled → "waitlisted"
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const { posting_id, cover_message, responses } = await parseBody<{
    posting_id?: string;
    cover_message?: string;
    responses?: Record<string, unknown>;
  }>(req);

  if (!posting_id || typeof posting_id !== "string") {
    throw new AppError("VALIDATION", "posting_id is required", 400);
  }

  // Ensure a profile row exists (FK target for applicant_id).
  // If the user authenticated but never completed onboarding, create a stub
  // so the join request always succeeds.
  let profile = await getProfile(supabase, user.id);
  if (!profile) {
    const { data: stub } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })
      .select("*")
      .single();
    profile = stub;
  }

  // Fetch the posting
  const posting = await getPosting(supabase, posting_id);

  if (!posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  // Cannot apply to own posting
  if (posting.creator_id === user.id) {
    throw new AppError("VALIDATION", "Cannot apply to your own posting", 400);
  }

  // Check posting is open or filled (filled = waitlist)
  if (posting.status !== "open" && posting.status !== "filled") {
    throw new AppError(
      "VALIDATION",
      "This posting is no longer accepting requests",
      400,
    );
  }

  // Check for existing application to prevent duplicates
  const existing = await getApplicationForPosting(
    supabase,
    posting_id,
    user.id,
  );

  if (existing) {
    throw new AppError(
      "CONFLICT",
      "You have already applied to this posting",
      409,
    );
  }

  // Check for active invite where user is an invitee
  const { data: activeInvite } = await supabase
    .from("friend_asks")
    .select(
      "id, pending_invitees, ordered_friend_list, invite_mode, declined_list",
    )
    .eq("posting_id", posting_id)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();

  if (activeInvite) {
    const inviteMode = activeInvite.invite_mode ?? "sequential";
    const declinedList: string[] = activeInvite.declined_list ?? [];
    const isInvited =
      inviteMode === "parallel"
        ? activeInvite.ordered_friend_list.includes(user.id) &&
          !declinedList.includes(user.id)
        : ((activeInvite.pending_invitees as string[]) ?? []).includes(user.id);

    if (isInvited) {
      throw new AppError(
        "CONFLICT",
        "You have a pending invite for this posting. Please respond to the invite instead.",
        409,
      );
    }
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
  const application = await createApplication(supabase, {
    posting_id,
    applicant_id: user.id,
    cover_message: effectiveCoverMessage,
    status: initialStatus,
    ...(responses && typeof responses === "object" ? { responses } : {}),
  });

  // --- Notifications ---

  const applicantName = profile?.full_name || user.email || "Someone";

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

  notifyIfPreferred(supabase, posting.creator_id, "interest_received", {
    userId: posting.creator_id,
    type: "application_received",
    title: notifTitle,
    body: notifBody,
    relatedPostingId: posting_id,
    relatedApplicationId: application.id,
    relatedUserId: user.id,
  });

  // Auto-accept: check if posting should be marked as filled
  if (isAutoAccept && !isFilled) {
    await markPostingFilledIfFull(
      supabase,
      posting_id,
      "applications",
      "posting_id",
    );
  }

  // Compute waitlist position if waitlisted
  let waitlistPosition: number | null = null;
  if (initialStatus === "waitlisted") {
    const count = await countApplicationsByStatus(
      supabase,
      posting_id,
      "waitlisted",
    );
    waitlistPosition = count || 1;
  }

  return apiSuccess(
    { application, status: initialStatus, waitlistPosition },
    201,
  );
});
