/**
 * Extract skill names from Supabase join-table rows
 * (e.g. `posting_skills(skill_nodes(name))` or `profile_skills(skill_nodes(name))`).
 *
 * Returns the derived names when available, otherwise the fallback value.
 */

// Supabase join-query types vary (object vs array) depending on relation
// cardinality, so we accept unknown[] and validate at runtime.
type JoinSkillRow = { skill_nodes?: unknown };

/** Derive names only — returns empty array when join rows are absent. */
export function deriveSkillNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  joinRows: JoinSkillRow[] | any[] | null | undefined,
): string[] {
  if (!Array.isArray(joinRows) || joinRows.length === 0) return [];
  return joinRows
    .map((r) => {
      const node = r.skill_nodes;
      return typeof node === "object" && node && "name" in node
        ? (node.name as string)
        : null;
    })
    .filter((n): n is string => !!n);
}
