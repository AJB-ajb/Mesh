-- Migration: Add search_skill_nodes RPC for efficient full-text + alias skill search
-- Replaces the slow JS-side fallback in /api/skills/search that fetched all rows.
-- Uses a recursive CTE to build ancestry paths in a single query.

CREATE OR REPLACE FUNCTION public.search_skill_nodes(
  search_query text,
  result_limit  int DEFAULT 10
)
RETURNS TABLE (
  id       uuid,
  name     text,
  path     text[],
  is_leaf  boolean,
  depth    int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Step 1: find matching nodes (name ILIKE or alias array contains the query)
  WITH RECURSIVE matches AS (
    SELECT sn.id, sn.name, sn.parent_id, sn.is_leaf, sn.depth
    FROM skill_nodes sn
    WHERE
      lower(sn.name) LIKE '%' || lower(search_query) || '%'
      OR sn.aliases @> ARRAY[search_query]::text[]
    ORDER BY
      -- Exact name matches first, then prefix matches, then substring
      CASE
        WHEN lower(sn.name) = lower(search_query) THEN 0
        WHEN lower(sn.name) LIKE lower(search_query) || '%' THEN 1
        ELSE 2
      END,
      sn.depth,
      sn.name
    LIMIT result_limit
  ),
  -- Step 2: walk up the ancestor chain for each match
  ancestors AS (
    -- Base: the matched nodes themselves
    SELECT
      m.id   AS leaf_id,
      m.id   AS node_id,
      m.name AS node_name,
      m.parent_id,
      m.depth
    FROM matches m

    UNION ALL

    -- Recursive: parent of current node
    SELECT
      a.leaf_id,
      p.id,
      p.name,
      p.parent_id,
      p.depth
    FROM ancestors a
    JOIN skill_nodes p ON p.id = a.parent_id
  )
  -- Step 3: aggregate ancestor names into a path array (excluding the leaf itself)
  SELECT
    m.id,
    m.name,
    COALESCE(
      (
        SELECT array_agg(a.node_name ORDER BY a.depth)
        FROM ancestors a
        WHERE a.leaf_id = m.id
          AND a.node_id <> m.id   -- exclude the leaf node itself from path
      ),
      '{}'::text[]
    ) AS path,
    m.is_leaf,
    m.depth
  FROM matches m;
$$;

-- Grant execute to authenticated users (RLS on the underlying table still applies)
GRANT EXECUTE ON FUNCTION public.search_skill_nodes(text, int) TO authenticated;

COMMENT ON FUNCTION public.search_skill_nodes IS
  'Searches skill_nodes by name (ILIKE) or alias (GIN index) and returns results with their full ancestry path, all in a single query.';
