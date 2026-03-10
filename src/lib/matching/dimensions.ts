/**
 * Shared match-score dimension definitions used across breakdown UIs.
 */

export const MATCH_DIMENSIONS = [
  {
    key: "semantic" as const,
    label: "Relevance",
    description: "Alignment in interests and posting description",
  },
  {
    key: "availability" as const,
    label: "Availability",
    description: "Schedule compatibility between you and the posting",
  },
  {
    key: "skill_level" as const,
    label: "Skill Level",
    description: "How well your skill levels match the posting requirements",
  },
  {
    key: "location" as const,
    label: "Location",
    description: "Geographic proximity weighted by location preferences",
  },
] as const;

export type MatchDimensionKey = (typeof MATCH_DIMENSIONS)[number]["key"];
