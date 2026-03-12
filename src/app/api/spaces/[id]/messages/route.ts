import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type { SpaceMessageInsert } from "@/lib/supabase/types";

/**
 * GET /api/spaces/[id]/messages
 * Paginated messages for a space. Requires membership.
 * Supports cursor-based pagination via `before` (message ID).
 */
export const GET = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const before = searchParams.get("before"); // cursor: message ID

  let query = supabase
    .from("space_messages")
    .select(
      `
      *,
      profiles:sender_id (full_name, user_id),
      space_postings:posting_id (id, text, category, tags, status, capacity, team_size_min)
    `,
    )
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    // Fetch the cursor message's created_at for range filtering
    const { data: cursorMsg } = await supabase
      .from("space_messages")
      .select("created_at")
      .eq("id", before)
      .single();

    if (cursorMsg) {
      query = query.lt("created_at", cursorMsg.created_at);
    }
  }

  const { data: messages, error } = await query;

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch messages: ${error.message}`,
      500,
    );
  }

  // Update last_read_at for the member
  await supabase
    .from("space_members")
    .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
    .eq("space_id", spaceId)
    .eq("user_id", user.id);

  return apiSuccess({
    messages: messages ?? [],
    has_more: (messages?.length ?? 0) === limit,
  });
});

/**
 * POST /api/spaces/[id]/messages
 * Send a message to a space. Requires membership.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    content: string;
    type?: SpaceMessageInsert["type"];
  }>(req);

  if (!body.content?.trim()) {
    throw new AppError("VALIDATION", "Message content is required", 400);
  }

  const { data: message, error } = await supabase
    .from("space_messages")
    .insert({
      space_id: spaceId,
      sender_id: user.id,
      type: body.type ?? "message",
      content: body.content.trim(),
    })
    .select(
      `
      *,
      profiles:sender_id (full_name, user_id)
    `,
    )
    .single();

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to send message: ${error.message}`,
      500,
    );
  }

  // Update space's updated_at to keep ordering fresh
  await supabase
    .from("spaces")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", spaceId);

  // Increment unread_count for other members
  // (uses raw RPC or a manual update for all members except sender)
  await supabase.rpc("increment_unread_counts", {
    p_space_id: spaceId,
    p_sender_id: user.id,
  });

  return apiSuccess({ message }, 201);
});
