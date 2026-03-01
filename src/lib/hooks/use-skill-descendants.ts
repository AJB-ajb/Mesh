/**
 * Hook to resolve skill node IDs to their tree-expanded descendant IDs.
 * Caches results via SWR.
 */

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

async function fetchDescendants(skillId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_skill_descendants", {
    root_skill_id: skillId,
  });

  if (error) {
    throw new Error(`Failed to get descendants: ${error.message}`);
  }

  return (data || []).map((row: { id: string }) => row.id);
}

/**
 * Given an array of selected skill node IDs, resolves all descendant IDs.
 * Uses SWR caching per skill ID.
 *
 * @param selectedSkillIds - Array of skill node UUIDs
 * @returns Resolved set of all descendant IDs (inclusive of parents)
 */
export function useSkillDescendants(selectedSkillIds: string[]) {
  // Create a stable key from sorted IDs
  const key =
    selectedSkillIds.length > 0
      ? `skill-descendants/${[...selectedSkillIds].sort().join(",")}`
      : null;

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const allDescendants = new Set<string>();

      // Fetch descendants for each selected skill in parallel
      const results = await Promise.all(
        selectedSkillIds.map((id) => fetchDescendants(id)),
      );

      for (const descendants of results) {
        for (const id of descendants) {
          allDescendants.add(id);
        }
      }

      return Array.from(allDescendants);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  );

  return {
    descendantIds: data ?? selectedSkillIds,
    error,
    isLoading,
  };
}
