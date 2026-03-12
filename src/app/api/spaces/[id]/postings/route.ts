import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type { SpacePostingInsert } from "@/lib/supabase/types";

/**
 * GET /api/spaces/[id]/postings
 * List postings in a space. Requires membership.
 */
export const GET = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 50);
  const offset = Number(searchParams.get("offset") || 0);
  const status = searchParams.get("status"); // optional filter

  let query = supabase
    .from("space_postings")
    .select(
      `
      *,
      profiles:created_by (full_name, user_id)
    `,
    )
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: postings, error } = await query;

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch postings: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ postings: postings ?? [] });
});

/**
 * POST /api/spaces/[id]/postings
 * Create a posting in a space. Requires membership.
 *
 * Steps:
 * 1. Create the space_posting row.
 * 2. Create a space_message with type='posting' and posting_id set.
 * 3. If the parent space is posting-only or has many members, create a sub-Space.
 * 4. Return the created posting.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<
    Omit<SpacePostingInsert, "space_id" | "created_by"> & {
      create_sub_space?: boolean;
    }
  >(req);

  if (!body.text?.trim()) {
    throw new AppError("VALIDATION", "Posting text is required", 400);
  }

  // 1. Create the posting
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .insert({
      space_id: spaceId,
      created_by: user.id,
      text: body.text.trim(),
      category: body.category ?? null,
      tags: body.tags ?? [],
      capacity: body.capacity ?? 2,
      team_size_min: body.team_size_min ?? 1,
      deadline: body.deadline ?? null,
      activity_date: body.activity_date ?? null,
      visibility: body.visibility ?? "public",
      auto_accept: body.auto_accept ?? false,
      extracted_metadata: body.extracted_metadata ?? {},
    })
    .select()
    .single();

  if (postingError) {
    throw new AppError(
      "INTERNAL",
      `Failed to create posting: ${postingError.message}`,
      500,
    );
  }

  // 2. Create a message with type='posting' referencing the new posting
  const { error: msgError } = await supabase.from("space_messages").insert({
    space_id: spaceId,
    sender_id: user.id,
    type: "posting",
    posting_id: posting.id,
    content: body.text.trim(),
  });

  if (msgError) {
    console.error("Failed to create posting message:", msgError.message);
    // Non-fatal: the posting was created, message is supplementary
  }

  // 3. Determine if a sub-space should be created
  const { data: parentSpace } = await supabase
    .from("spaces")
    .select("settings")
    .eq("id", spaceId)
    .single();

  const isPostingOnly = parentSpace?.settings?.posting_only === true;
  const shouldCreateSubSpace = isPostingOnly || body.create_sub_space === true;

  if (shouldCreateSubSpace) {
    const subSpaceName = body.text.trim().slice(0, 80);

    const { data: subSpace, error: subSpaceError } = await supabase
      .from("spaces")
      .insert({
        name: subSpaceName,
        parent_space_id: spaceId,
        source_posting_id: posting.id,
        created_by: user.id,
        inherits_members: false,
        settings: { visibility: "private" },
      })
      .select()
      .single();

    if (subSpaceError) {
      console.error("Failed to create sub-space:", subSpaceError.message);
      // Non-fatal: posting was still created
    } else {
      // Add creator as admin of sub-space
      await supabase.from("space_members").insert({
        space_id: subSpace.id,
        user_id: user.id,
        role: "admin",
      });

      // Link sub-space back to posting
      await supabase
        .from("space_postings")
        .update({ sub_space_id: subSpace.id })
        .eq("id", posting.id);

      posting.sub_space_id = subSpace.id;
    }
  }

  // Update space's updated_at
  await supabase
    .from("spaces")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", spaceId);

  return apiSuccess({ posting }, 201);
});
