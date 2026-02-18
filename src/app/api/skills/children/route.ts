import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/skills/children?parentId=uuid
 *
 * Returns direct children of a skill node for tree browsing.
 * If parentId is omitted, returns root categories.
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For each non-leaf child, count its children
  const results = await Promise.all(
    (children ?? []).map(async (child) => {
      let childCount = 0;
      if (!child.is_leaf) {
        const { count } = await supabase
          .from("skill_nodes")
          .select("id", { count: "exact", head: true })
          .eq("parent_id", child.id);
        childCount = count ?? 0;
      }
      return {
        id: child.id,
        name: child.name,
        isLeaf: child.is_leaf,
        childCount,
      };
    }),
  );

  // Also build the parent's path for breadcrumb navigation
  const parentPath: string[] = [];
  if (parentId) {
    const { data: allNodes } = await supabase
      .from("skill_nodes")
      .select("id, name, parent_id");

    if (allNodes) {
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
      let current = nodeMap.get(parentId);
      while (current) {
        parentPath.unshift(current.name);
        current = current.parent_id
          ? nodeMap.get(current.parent_id)
          : undefined;
      }
    }
  }

  return NextResponse.json({ children: results, parentPath });
}
