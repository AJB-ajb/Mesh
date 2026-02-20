import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * GET /api/skills/children?parentId=uuid
 *
 * Returns direct children of a skill node for tree browsing.
 * If parentId is omitted, returns root categories.
 *
 * Performance: uses a single aggregated query for child counts instead of
 * N individual COUNT queries (one per non-leaf child).
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");

  // Fetch direct children
  let query = supabase
    .from("skill_nodes")
    .select("id, name, is_leaf, depth")
    .order("name");

  if (parentId) {
    query = query.eq("parent_id", parentId);
  } else {
    query = query.is("parent_id", null);
  }

  const { data: children, error } = await query;

  if (error) {
    return apiError("INTERNAL", error.message, 500);
  }

  const childList = children ?? [];

  // Collect IDs of non-leaf children so we can count their children in one query
  const nonLeafIds = childList.filter((c) => !c.is_leaf).map((c) => c.id);

  // Single aggregated query: fetch all grandchildren parent_ids at once
  const countMap = new Map<string, number>();
  if (nonLeafIds.length > 0) {
    const { data: grandchildren } = await supabase
      .from("skill_nodes")
      .select("parent_id")
      .in("parent_id", nonLeafIds);

    for (const row of grandchildren ?? []) {
      if (row.parent_id) {
        countMap.set(row.parent_id, (countMap.get(row.parent_id) ?? 0) + 1);
      }
    }
  }

  const results = childList.map((child) => ({
    id: child.id,
    name: child.name,
    isLeaf: child.is_leaf,
    childCount: countMap.get(child.id) ?? 0,
  }));

  // Build the parent's path for breadcrumb navigation.
  // We only need to walk up at most `depth` hops (max 5), so fetch just the
  // ancestor chain rather than all rows.
  const parentPath: string[] = [];
  if (parentId) {
    // Walk up the ancestor chain iteratively — at most 5 hops
    let currentId: string | null = parentId;
    while (currentId) {
      const { data } = await supabase
        .from("skill_nodes")
        .select("id, name, parent_id")
        .eq("id", currentId)
        .single();

      const node = data as {
        id: string;
        name: string;
        parent_id: string | null;
      } | null;

      if (!node) break;
      parentPath.unshift(node.name);
      currentId = node.parent_id ?? null;
    }
  }

  return apiSuccess({ children: results, parentPath });
}
