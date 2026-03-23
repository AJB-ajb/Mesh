import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";

/**
 * POST /api/spaces/[id]/postings/[pid]/promote
 * Promote a space posting to the Global Space (Explore).
 * Creates a linked posting-message in the Global Space.
 * Only the posting creator or a space admin can promote.
 */
export const POST = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;

  const member = await verifySpaceMembership(supabase, spaceId, user.id);

  // Fetch the posting
  const { data: posting, error: fetchError } = await supabase
    .from("space_postings")
    .select("*")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (fetchError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  // Only creator or admin can promote
  if (posting.created_by !== user.id && member.role !== "admin") {
    throw new AppError(
      "FORBIDDEN",
      "Only the posting creator or a space admin can promote",
      403,
    );
  }

  // Don't promote from global space to itself
  if (spaceId === GLOBAL_SPACE_ID) {
    throw new AppError(
      "VALIDATION",
      "Cannot promote from the Global Space",
      400,
    );
  }

  // Check if already promoted (look for a posting in global space with same text from same creator)
  const { data: existing } = await supabase
    .from("space_postings")
    .select("id")
    .eq("space_id", GLOBAL_SPACE_ID)
    .eq("created_by", posting.created_by)
    .eq("text", posting.text)
    .maybeSingle();

  if (existing) {
    throw new AppError(
      "VALIDATION",
      "This posting has already been promoted",
      400,
    );
  }

  // Verify the user is a member of the global space
  const { data: globalMember } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", GLOBAL_SPACE_ID)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!globalMember) {
    throw new AppError(
      "FORBIDDEN",
      "You must be a member of the Global Space to promote",
      403,
    );
  }

  // Fetch the source space name for the promoted posting text
  const { data: sourceSpace } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();

  const spaceName = sourceSpace?.name ?? "a Space";

  // Create a new posting in the Global Space
  const { data: promotedPosting, error: insertError } = await supabase
    .from("space_postings")
    .insert({
      space_id: GLOBAL_SPACE_ID,
      created_by: posting.created_by,
      text: posting.text,
      category: posting.category,
      tags: posting.tags,
      capacity: posting.capacity,
      team_size_min: posting.team_size_min,
      deadline: posting.deadline,
      activity_date: posting.activity_date,
      visibility: "public",
      auto_accept: posting.auto_accept,
      extracted_metadata: {
        ...(typeof posting.extracted_metadata === "object" &&
        posting.extracted_metadata !== null
          ? posting.extracted_metadata
          : {}),
        promoted_from: { space_id: spaceId, space_name: spaceName },
      },
    })
    .select("id")
    .single();

  if (insertError) {
    throw new AppError(
      "INTERNAL",
      `Failed to promote posting: ${insertError.message}`,
      500,
    );
  }

  // Create a message in the Global Space referencing the promoted posting
  await supabase.from("space_messages").insert({
    space_id: GLOBAL_SPACE_ID,
    sender_id: user.id,
    type: "posting",
    posting_id: promotedPosting.id,
    content: posting.text,
  });

  return apiSuccess(
    { promoted_posting_id: promotedPosting.id, from_space: spaceName },
    201,
  );
});
