import type { PostingFilters } from "@/lib/types/filters";

interface FilterablePosting {
  category?: string | null;
  mode?: string;
  location_mode?: string | null;
  location_preference?: number | null;
  location_name?: string | null;
  skills?: string[];
  tags?: string[];
  estimated_time?: string | null;
  team_size_min?: number;
  team_size_max?: number;
}

/**
 * Parse an estimated_time string into hours per week (best-effort).
 * Handles formats like "10h/week", "10-20 hours/week", "20 hours", "5h/w".
 */
export function parseHoursPerWeek(
  estimatedTime: string | null | undefined,
): { min: number; max: number } | null {
  if (!estimatedTime) return null;

  const text = estimatedTime.toLowerCase();

  // Match patterns like "10-20h/week", "10-20 hours/week", "10-20h/w"
  const rangeMatch = text.match(
    /(\d+)\s*[-–]\s*(\d+)\s*h(?:ours?)?(?:\s*\/\s*w(?:eek)?)?/,
  );
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  }

  // Match patterns like "10h/week", "10 hours/week", "10h/w", "10+ hours/week"
  const singleMatch = text.match(
    /(\d+)\+?\s*h(?:ours?)?(?:\s*\/\s*w(?:eek)?)?/,
  );
  if (singleMatch) {
    const value = parseInt(singleMatch[1]);
    return { min: value, max: value };
  }

  return null;
}

/**
 * Check if a posting's location_mode matches the filter's location_mode.
 * Falls back to location_preference if location_mode is not set.
 */
function matchesLocationMode(
  posting: FilterablePosting,
  filterMode: string,
): boolean {
  // Direct match on location_mode field
  if (posting.location_mode) {
    if (filterMode === "either") return true;
    return posting.location_mode === filterMode;
  }

  // Fallback: infer from location_preference (0.0=in-person, 0.5=either, 1.0=remote)
  if (posting.location_preference != null) {
    if (filterMode === "either") return true;
    if (filterMode === "remote") return posting.location_preference >= 0.7;
    if (filterMode === "in_person") return posting.location_preference <= 0.3;
  }

  // No location data — let it pass
  return true;
}

/**
 * Apply structured filters to a posting array. Returns the subset that matches.
 * An empty filters object returns all postings (no filtering).
 */
export function applyFilters<T extends FilterablePosting>(
  postings: T[],
  filters: PostingFilters,
): T[] {
  const hasAnyFilter = Object.keys(filters).length > 0;
  if (!hasAnyFilter) return postings;

  return postings.filter((posting) => {
    // Category: exact match
    if (filters.category && posting.category !== filters.category) {
      return false;
    }

    // Mode: exact match
    if (filters.mode && posting.mode !== filters.mode) {
      return false;
    }

    // Location mode
    if (filters.location_mode) {
      if (!matchesLocationMode(posting, filters.location_mode)) {
        return false;
      }
    }

    // Location name: case-insensitive partial match
    if (filters.location_name && posting.location_name) {
      const filterLoc = filters.location_name.toLowerCase();
      const postingLoc = posting.location_name.toLowerCase();
      if (!postingLoc.includes(filterLoc)) {
        return false;
      }
    } else if (filters.location_name && !posting.location_name) {
      return false;
    }

    // Skills: intersection check (posting has at least one of the filter skills)
    if (filters.skills && filters.skills.length > 0) {
      const postingSkills = (posting.skills || []).map((s) => s.toLowerCase());
      const hasMatch = filters.skills.some((skill) =>
        postingSkills.includes(skill.toLowerCase()),
      );
      if (!hasMatch) return false;
    }

    // Tags: intersection check
    if (filters.tags && filters.tags.length > 0 && posting.tags) {
      const postingTags = posting.tags.map((t) => t.toLowerCase());
      const hasMatch = filters.tags.some((tag) =>
        postingTags.includes(tag.toLowerCase()),
      );
      if (!hasMatch) return false;
    } else if (
      filters.tags &&
      filters.tags.length > 0 &&
      (!posting.tags || posting.tags.length === 0)
    ) {
      return false;
    }

    // Hours per week: parse estimated_time and range-check
    if (
      filters.hours_per_week_min != null ||
      filters.hours_per_week_max != null
    ) {
      const parsed = parseHoursPerWeek(posting.estimated_time);
      if (parsed) {
        if (
          filters.hours_per_week_min != null &&
          parsed.max < filters.hours_per_week_min
        ) {
          return false;
        }
        if (
          filters.hours_per_week_max != null &&
          parsed.min > filters.hours_per_week_max
        ) {
          return false;
        }
      }
      // If we can't parse estimated_time, let the posting pass (best-effort)
    }

    // Team size: range check
    if (filters.team_size_min != null && posting.team_size_max != null) {
      if (posting.team_size_max < filters.team_size_min) return false;
    }
    if (filters.team_size_max != null && posting.team_size_min != null) {
      if (posting.team_size_min > filters.team_size_max) return false;
    }

    return true;
  });
}
