import { withAuth } from "@/lib/api/with-auth";
import { promoteFromWaitlist } from "@/lib/api/waitlist-promotion";
import { apiSuccess, AppError } from "@/lib/errors";
import { updateApplicationStatus } from "@/lib/data";
import { verifyApplicationOwnership } from "@/lib/api/guards";

const WITHDRAWABLE_STATUSES = ["pending", "accepted", "waitlisted"];

export const PATCH = withAuth(async (_req, { user, supabase, params }) => {
  const applicationId = params.id;

  // Fetch application and verify ownership
  const application = await verifyApplicationOwnership(
    supabase,
    applicationId,
    user.id,
  );

  if (!WITHDRAWABLE_STATUSES.includes(application.status)) {
    throw new AppError(
      "VALIDATION",
      `Cannot withdraw an application with status "${application.status}"`,
      400,
    );
  }

  const wasAccepted = application.status === "accepted";

  // Update to withdrawn
  await updateApplicationStatus(supabase, applicationId, "withdrawn");

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
