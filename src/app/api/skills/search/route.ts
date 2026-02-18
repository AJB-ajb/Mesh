import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/skills/search?q=react&limit=10
 *
 * Searches skill_nodes by name and aliases (case-insensitive).
 * Returns matching leaf nodes with their ancestry path.
 * When query is empty, returns top-level categories for browsing.
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
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "10", 10) || 10,
    50,
  );

  if (!query) {
    // Return top-level categories for browse mode
    const { data: roots, error } = await supabase
      .from("skill_nodes")
      .select("id, name, is_leaf, depth")
      .is("parent_id", null)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      results: (roots ?? []).map((n) => ({
        id: n.id,
        name: n.name,
        path: [],
        isLeaf: n.is_leaf,
        depth: n.depth,
      })),
    });
  }

  // Search by name or alias match using a server-side RPC
  // We use a raw query via rpc to do the alias search + ancestry path
  const { data, error } = await supabase.rpc("search_skill_nodes", {
    search_query: query,
    result_limit: limit,
  });

  if (error) {
    // Fallback: if RPC doesn't exist yet, do simple name search
    const { data: fallback, error: fbError } = await supabase
      .from("skill_nodes")
      .select("id, name, is_leaf, depth")
      .ilike("name", `%${query}%`)
      .limit(limit)
      .order("depth")
      .order("name");

    if (fbError) {
      return NextResponse.json({ error: fbError.message }, { status: 500 });
    }

    // Build paths for fallback results
    const results = await buildPaths(supabase, fallback ?? []);
    return NextResponse.json({ results });
  }

  return NextResponse.json({ results: data ?? [] });
}

/**
 * Build ancestry paths for a list of nodes by walking parent_id chains.
 */
async function buildPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nodes: Array<{ id: string; name: string; is_leaf: boolean; depth: number }>,
) {
  if (nodes.length === 0) return [];

  const { data: allNodes } = await supabase
    .from("skill_nodes")
    .select("id, name, parent_id, is_leaf, depth");

  if (!allNodes) {
    return nodes.map((n) => ({
      id: n.id,
      name: n.name,
      path: [],
      isLeaf: n.is_leaf,
      depth: n.depth,
    }));
  }

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return nodes.map((n) => {
    const path: string[] = [];
    let current = nodeMap.get(n.id);
    // Walk up parent chain to build path (excluding self)
    while (current?.parent_id) {
      const parent = nodeMap.get(current.parent_id);
      if (parent) {
        path.unshift(parent.name);
      }
      current = parent;
    }
    return {
      id: n.id,
      name: n.name,
      path,
      isLeaf: n.is_leaf,
      depth: n.depth,
    };
  });
}
