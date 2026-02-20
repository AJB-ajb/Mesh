import { withAuth } from "@/lib/api/with-auth";
import { promoteFromWaitlist } from "@/lib/api/waitlist-promotion";
import { apiSuccess, AppError } from "@/lib/errors";

const WITHDRAWABLE_STATUSES = ["pending", "accepted", "waitlisted"];

export const PATCH = withAuth(async (_req, { user, supabase, params }) => {
  const applicationId = params.id;

  // Fetch application
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, applicant_id, posting_id, status")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    throw new AppError("NOT_FOUND", "Application not found", 404);
  }

  if (application.applicant_id !== user.id) {
    throw new AppError(
      "FORBIDDEN",
      "Not authorized to withdraw this application",
      403,
    );
  }

  if (!WITHDRAWABLE_STATUSES.includes(application.status)) {
    throw new AppError(
      "VALIDATION",
      `Cannot withdraw an application with status "${application.status}"`,
      400,
    );
  }

  const wasAccepted = application.status === "accepted";

  // Update to withdrawn
  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: "withdrawn" })
    .eq("id", applicationId);

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to withdraw application: ${updateError.message}`,
      500,
    );
  }

  // If the user was accepted, a spot opened — promote from waitlist
  if (wasAccepted) {
    const { data: posting } = await supabase
      .from("postings")
      .select("id, title, creator_id, status, auto_accept, team_size_max")
      .eq("id", application.posting_id)
      .single();

    if (posting) {
      await promoteFromWaitlist(supabase, posting.id, posting);
    }
  }

  return apiSuccess({ application: { ...application, status: "withdrawn" } });
});
