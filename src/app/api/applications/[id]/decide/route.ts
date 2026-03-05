import { withAuth } from "@/lib/api/with-auth";
import { notifyIfPreferred } from "@/lib/api/notify-if-preferred";
import { markPostingFilledIfFull } from "@/lib/api/posting-fulfillment";
import { apiSuccess, parseBody, AppError } from "@/lib/errors";
import { getApplication, updateApplicationStatus } from "@/lib/data";
import { verifyPostingOwnership } from "@/lib/api/guards";

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

  // Fetch application
  const application = await getApplication(supabase, applicationId);

  if (!application) {
    throw new AppError("NOT_FOUND", "Application not found", 404);
  }

  // Verify the current user owns the posting
  const posting = await verifyPostingOwnership(
    supabase,
    application.posting_id,
    user.id,
  );

  // Update application status
  await updateApplicationStatus(supabase, applicationId, body.status);

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
