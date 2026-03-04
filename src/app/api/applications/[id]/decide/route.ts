import { withAuth } from "@/lib/api/with-auth";
import { notifyIfPreferred } from "@/lib/api/notify-if-preferred";
import { markPostingFilledIfFull } from "@/lib/api/posting-fulfillment";
import { apiSuccess, parseBody, AppError } from "@/lib/errors";

interface DecideBody {
  status: "accepted" | "rejected";
}

export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const applicationId = params.id;
  const body = await parseBody<DecideBody>(req);

  if (body.status !== "accepted" && body.status !== "rejected") {
    throw new AppError(
      "VALIDATION",
      'Status must be "accepted" or "rejected"',
      400,
    );
  }

  // Fetch application with posting
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, applicant_id, posting_id, status")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    throw new AppError("NOT_FOUND", "Application not found", 404);
  }

  // Fetch posting to verify ownership
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("id, creator_id, title, team_size_max, status")
    .eq("id", application.posting_id)
    .single();

  if (postingError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    throw new AppError(
      "FORBIDDEN",
      "Not authorized to decide on this application",
      403,
    );
  }

  // Update application status
  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: body.status })
    .eq("id", applicationId);

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to update application: ${updateError.message}`,
      500,
    );
  }

  // Notify applicant (check preferences)
  const notifType =
    body.status === "accepted"
      ? ("application_accepted" as const)
      : ("application_rejected" as const);

  notifyIfPreferred(supabase, application.applicant_id, notifType, {
    userId: application.applicant_id,
    type: notifType,
    title: body.status === "accepted" ? "Request Accepted!" : "Request Update",
    body:
      body.status === "accepted"
        ? `Your request to join "${posting.title}" has been accepted!`
        : `Your request to join "${posting.title}" was not selected.`,
    relatedPostingId: posting.id,
    relatedApplicationId: applicationId,
    relatedUserId: posting.creator_id,
  });

  // If accepting, check if team is now full
  if (body.status === "accepted") {
    await markPostingFilledIfFull(
      supabase,
      posting.id,
      "applications",
      "posting_id",
    );
  }

  return apiSuccess({ application: { ...application, status: body.status } });
});
